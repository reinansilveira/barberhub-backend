import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from '../../../src/modules/auth/auth.service';
import { ClientService } from '../../../src/modules/clients/client.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { makeCreateClientDto } from '../../mocks/factories/client.factory';
import { makePrismaMock } from '../../mocks/services/prisma.mock';
import {
  CLIENT_COMPLETO_STUB,
  CLIENT_RESPONSE_STUB,
} from '../../mocks/stubs/client.stub';

describe('ClientService', () => {
  let service: ClientService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  const session = {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    mustChangePassword: false,
  };
  const authMock = {
    issueClientSession: jest.fn(),
  };
  const redisMock = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    prismaMock = makePrismaMock();
    authMock.issueClientSession.mockResolvedValue(session);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuthService, useValue: authMock },
        { provide: 'REDIS', useValue: redisMock },
      ],
    }).compile();

    service = module.get(ClientService);
    jest.clearAllMocks();
    authMock.issueClientSession.mockResolvedValue(session);
  });

  it('é instanciado corretamente', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('busca o cliente ativo incluindo os dados do user', async () => {
      prismaMock.client.findFirst.mockResolvedValue(CLIENT_COMPLETO_STUB);

      const result = await service.findById(CLIENT_COMPLETO_STUB.id);

      expect(prismaMock.client.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CLIENT_COMPLETO_STUB.id },
          include: expect.objectContaining({ user: expect.any(Object) }),
        }),
      );
      expect(result).toEqual(CLIENT_RESPONSE_STUB);
    });

    it('retorna null quando o cliente não existe', async () => {
      prismaMock.client.findFirst.mockResolvedValue(null);

      await expect(service.findById('id-inexistente')).resolves.toBeNull();
    });
  });

  describe('getDashboard', () => {
    it('não seleciona e-mail ou telefone do profissional no dashboard do cliente', async () => {
      prismaMock.client.findUnique.mockResolvedValue(CLIENT_COMPLETO_STUB);
      prismaMock.appointment.findMany.mockResolvedValue([]);

      await service.getDashboard(CLIENT_COMPLETO_STUB.id);

      const query = prismaMock.appointment.findMany.mock.calls[0][0];
      expect(query.include.professional.include.user.select).toEqual({
        id: true,
        name: true,
      });
      expect(JSON.stringify(query)).not.toContain('email');
      expect(JSON.stringify(query)).not.toContain('phone');
    });
  });

  describe('create', () => {
    const setupHappyPath = () => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(CLIENT_COMPLETO_STUB.user);
      prismaMock.client.create.mockResolvedValue(CLIENT_COMPLETO_STUB);
    };

    it('cria primeiro o user e vincula o client pelo userId', async () => {
      setupHappyPath();
      const dto = makeCreateClientDto();

      await service.create(dto);

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          password: null,
          role: 'CLIENT',
        }),
      });
      expect(prismaMock.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userId: CLIENT_COMPLETO_STUB.user.id,
            phoneVerifiedAt: null,
          },
        }),
      );
    });

    it('retorna apenas o cadastro público e não cria sessão em cadastro administrativo', async () => {
      setupHappyPath();

      const result = await service.create(makeCreateClientDto());

      expect(result).toEqual(CLIENT_RESPONSE_STUB);
      expect(authMock.issueClientSession).not.toHaveBeenCalled();
    });

    it('não cria registros quando telefone ou email já pertencem a um user', async () => {
      prismaMock.user.findFirst.mockResolvedValue(CLIENT_COMPLETO_STUB.user);

      await expect(service.create(makeCreateClientDto())).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.user.create).not.toHaveBeenCalled();
      expect(prismaMock.client.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('atualiza os dados pessoais no user e mantém o client enxuto', async () => {
      prismaMock.client.findUnique.mockResolvedValue(CLIENT_COMPLETO_STUB);
      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.user.update.mockResolvedValue(CLIENT_COMPLETO_STUB.user);
      const dto = makeCreateClientDto({ name: 'João Atualizado' });

      const result = await service.update(CLIENT_COMPLETO_STUB.id, dto);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: CLIENT_COMPLETO_STUB.userId },
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
        },
      });
      expect(result).toEqual(CLIENT_RESPONSE_STUB);
    });

    it('lança erro quando o cliente não existe', async () => {
      prismaMock.client.findUnique.mockResolvedValue(null);

      await expect(
        service.update('id-inexistente', makeCreateClientDto()),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('desativa duas etapas e invalida sessões quando o telefone é alterado', async () => {
      const clientWithTwoFactor = {
        ...CLIENT_COMPLETO_STUB,
        user: { ...CLIENT_COMPLETO_STUB.user, twoFactorEnabled: true },
      };
      const updatedClient = {
        ...clientWithTwoFactor,
        phoneVerifiedAt: null,
        user: {
          ...clientWithTwoFactor.user,
          phone: '79999887766',
          twoFactorEnabled: false,
        },
      };
      prismaMock.client.findUnique
        .mockResolvedValueOnce(clientWithTwoFactor)
        .mockResolvedValueOnce(updatedClient);
      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.user.update.mockResolvedValue(updatedClient.user);
      prismaMock.client.update.mockResolvedValue(updatedClient);

      await service.update(
        CLIENT_COMPLETO_STUB.id,
        makeCreateClientDto({ phone: '79999887766' }),
      );

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: CLIENT_COMPLETO_STUB.userId },
        data: expect.objectContaining({
          phone: '79999887766',
          twoFactorEnabled: false,
          sessionVersion: { increment: 1 },
        }),
      });
      expect(prismaMock.client.update).toHaveBeenCalledWith({
        where: { id: CLIENT_COMPLETO_STUB.id },
        data: { phoneVerifiedAt: null },
      });
    });
  });

  describe('updateAvatar', () => {
    it('salva o avatar no user e o devolve na resposta', async () => {
      const avatar = 'data:image/jpeg;base64,avatar';
      const clientWithAvatar = {
        ...CLIENT_COMPLETO_STUB,
        user: { ...CLIENT_COMPLETO_STUB.user, avatar },
      };
      prismaMock.client.findUnique
        .mockResolvedValueOnce(CLIENT_COMPLETO_STUB)
        .mockResolvedValueOnce(clientWithAvatar);
      prismaMock.user.update.mockResolvedValue(clientWithAvatar.user);

      const result = await service.updateAvatar(CLIENT_COMPLETO_STUB.id, {
        avatar,
      });

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: CLIENT_COMPLETO_STUB.userId },
        data: { avatar },
      });
      expect(result.avatar).toBe(avatar);
    });
  });

  describe('desactivate', () => {
    it('desativa o user e o client', async () => {
      prismaMock.client.findUnique.mockResolvedValue(CLIENT_COMPLETO_STUB);
      prismaMock.user.update.mockResolvedValue({
        ...CLIENT_COMPLETO_STUB.user,
        active: false,
      });
      prismaMock.client.update.mockResolvedValue({
        ...CLIENT_COMPLETO_STUB,
        active: false,
      });

      const result = await service.desactivate(CLIENT_COMPLETO_STUB.id);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: CLIENT_COMPLETO_STUB.userId },
        data: { active: false },
      });
      expect(prismaMock.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: CLIENT_COMPLETO_STUB.id },
          data: { active: false, reengagementSentAt: null },
        }),
      );
      expect(result.active).toBe(false);
    });
  });
});
