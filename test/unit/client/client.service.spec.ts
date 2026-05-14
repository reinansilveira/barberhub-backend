import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';

import { ClientService } from '../../../src/modules/clients/client.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { ClientCreateMapper } from '../../../src/modules/clients/mappers/client-create.mapper';

import { makePrismaMock } from '../../mocks/services/prisma.mock';
import { makeCreateClientDto } from '../../mocks/factories/client.factory';
import {
  CLIENT_COMPLETO_STUB,
  CLIENT_RESPONSE_STUB,
} from '../../mocks/stubs/client.stub';

jest.mock('../../../src/modules/client/mappers/client-create.mapper');
const ClientCreateMapperMock = ClientCreateMapper as jest.Mocked<typeof ClientCreateMapper>;

describe('ClientService', () => {
  let service: ClientService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prismaMock = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(ClientService);
    jest.clearAllMocks();
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('busca cliente ativo por padrão quando active não é informado', async () => {
      prismaMock.client.findFirst.mockResolvedValue(CLIENT_COMPLETO_STUB);

      await service.findById('uuid-client-1');

      expect(prismaMock.client.findFirst).toHaveBeenCalledWith({
        where: { id: 'uuid-client-1', active: true },
      });
    });

    it('busca cliente ativo quando active é qualquer valor diferente de "false"', async () => {
      prismaMock.client.findFirst.mockResolvedValue(CLIENT_COMPLETO_STUB);

      await service.findById('uuid-client-1', 'true');

      expect(prismaMock.client.findFirst).toHaveBeenCalledWith({
        where: { id: 'uuid-client-1', active: true },
      });
    });

    it('busca cliente inativo quando active é "false"', async () => {
      prismaMock.client.findFirst.mockResolvedValue({
        ...CLIENT_COMPLETO_STUB,
        active: false,
      });

      await service.findById('uuid-client-1', 'false');

      expect(prismaMock.client.findFirst).toHaveBeenCalledWith({
        where: { id: 'uuid-client-1', active: false },
      });
    });

    it('retorna o cliente encontrado', async () => {
      prismaMock.client.findFirst.mockResolvedValue(CLIENT_COMPLETO_STUB);

      const result = await service.findById('uuid-client-1');

      expect(result).toEqual(CLIENT_COMPLETO_STUB);
    });

    it('retorna null quando o cliente não existe', async () => {
      prismaMock.client.findFirst.mockResolvedValue(null);

      const result = await service.findById('id-inexistente');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const setupHappyPath = () => {
      prismaMock.client.findFirst.mockResolvedValue(null);
      prismaMock.client.create.mockResolvedValue(CLIENT_COMPLETO_STUB);
      ClientCreateMapperMock.toResponse.mockReturnValue(CLIENT_RESPONSE_STUB);
    };

    it('verifica se o telefone já existe antes de criar', async () => {
      setupHappyPath();
      const dto = makeCreateClientDto();

      await service.create(dto);

      expect(prismaMock.client.findFirst).toHaveBeenCalledWith({
        where: { phone: dto.phone },
      });
    });

    it('cria o cliente com os dados do DTO e phoneVerifiedAt nulo', async () => {
      setupHappyPath();
      const dto = makeCreateClientDto();

      await service.create(dto);

      expect(prismaMock.client.create).toHaveBeenCalledWith({
        data: { ...dto, phoneVerifiedAt: null },
      });
    });

    it('retorna os dados mapeados pelo ClientCreateMapper', async () => {
      setupHappyPath();

      const result = await service.create(makeCreateClientDto());

      expect(result).toEqual(CLIENT_RESPONSE_STUB);
    });

    it('passa o cliente criado para o mapper', async () => {
      setupHappyPath();

      await service.create(makeCreateClientDto());

      expect(ClientCreateMapperMock.toResponse).toHaveBeenCalledWith(CLIENT_COMPLETO_STUB);
    });

    it('lança ConflictException quando o telefone já está cadastrado', async () => {
      prismaMock.client.findFirst.mockResolvedValue(CLIENT_COMPLETO_STUB);

      await expect(service.create(makeCreateClientDto())).rejects.toThrow(
        ConflictException,
      );
    });

    it('não cria o cliente quando o telefone já existe', async () => {
      prismaMock.client.findFirst.mockResolvedValue(CLIENT_COMPLETO_STUB);

      await service.create(makeCreateClientDto()).catch(() => {});

      expect(prismaMock.client.create).not.toHaveBeenCalled();
    });

    it('lança ConflictException com telefone de formato diferente mas já cadastrado', async () => {
      prismaMock.client.findFirst.mockResolvedValue(CLIENT_COMPLETO_STUB);

      await expect(
        service.create(makeCreateClientDto({ phone: '+5579999999999' })),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    const setupHappyPath = () => {
      prismaMock.client.findUnique.mockResolvedValue(CLIENT_COMPLETO_STUB);
      prismaMock.client.update.mockResolvedValue({
        ...CLIENT_COMPLETO_STUB,
        name: 'João Atualizado',
      });
    };

    it('busca o cliente pelo id antes de atualizar', async () => {
      setupHappyPath();

      await service.update('uuid-client-1', makeCreateClientDto());

      expect(prismaMock.client.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-client-1' },
      });
    });

    it('atualiza o cliente com os dados corretos', async () => {
      setupHappyPath();
      const dto = makeCreateClientDto({ name: 'João Atualizado' });

      await service.update('uuid-client-1', dto);

      expect(prismaMock.client.update).toHaveBeenCalledWith({
        where: { id: 'uuid-client-1' },
        data: dto,
      });
    });

    it('retorna o cliente atualizado', async () => {
      setupHappyPath();
      const clienteAtualizado = { ...CLIENT_COMPLETO_STUB, name: 'João Atualizado' };
      prismaMock.client.update.mockResolvedValue(clienteAtualizado);

      const result = await service.update('uuid-client-1', makeCreateClientDto());

      expect(result).toEqual(clienteAtualizado);
    });

    it('lança BadRequestException quando o cliente não existe', async () => {
      prismaMock.client.findUnique.mockResolvedValue(null);

      await expect(
        service.update('id-inexistente', makeCreateClientDto()),
      ).rejects.toThrow(BadRequestException);
    });

    it('não chama update quando o cliente não existe', async () => {
      prismaMock.client.findUnique.mockResolvedValue(null);

      await service.update('id-inexistente', makeCreateClientDto()).catch(() => {});

      expect(prismaMock.client.update).not.toHaveBeenCalled();
    });
  });

  describe('desactivate', () => {
    it('desativa o cliente definindo active como false', async () => {
      prismaMock.client.update.mockResolvedValue({
        ...CLIENT_COMPLETO_STUB,
        active: false,
        reengagementSentAt: null,
      });

      await service.desactivate('uuid-client-1');

      expect(prismaMock.client.update).toHaveBeenCalledWith({
        where: { id: 'uuid-client-1' },
        data: { active: false, reengagementSentAt: null },
      });
    });

    it('zera o reengagementSentAt ao desativar', async () => {
      prismaMock.client.update.mockResolvedValue({
        ...CLIENT_COMPLETO_STUB,
        active: false,
        reengagementSentAt: null,
      });

      await service.desactivate('uuid-client-1');

      expect(prismaMock.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reengagementSentAt: null }),
        }),
      );
    });

    it('retorna o cliente desativado', async () => {
      const clienteDesativado = {
        ...CLIENT_COMPLETO_STUB,
        active: false,
        reengagementSentAt: null,
      };
      prismaMock.client.update.mockResolvedValue(clienteDesativado);

      const result = await service.desactivate('uuid-client-1');

      expect(result).toEqual(clienteDesativado);
    });
  });
});