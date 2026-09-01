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
          where: { id: CLIENT_COMPLETO_STUB.id, active: true },
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

    it('retorna userId e a sessão do cliente', async () => {
      setupHappyPath();

      const result = await service.create(makeCreateClientDto());

      expect(result).toEqual({ ...CLIENT_RESPONSE_STUB, ...session });
      expect(authMock.issueClientSession).toHaveBeenCalledWith(
        CLIENT_COMPLETO_STUB.id,
      );
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
