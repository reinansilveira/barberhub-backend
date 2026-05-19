import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { Services } from '../../../src/modules/service/services.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';

import { makePrismaMock } from '../../mocks/services/prisma.mock';
import { makeCreateServiceDto } from '../../mocks/factories/service.factory';
import { SERVICE_STUB, SERVICE_INATIVO_STUB } from '../../mocks/stubs/service.stub';

describe('Services', () => {
  let service: Services;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prismaMock = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Services,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(Services);
    jest.clearAllMocks();
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('busca serviços ativos por padrão quando active não é informado', async () => {
      prismaMock.service.findMany.mockResolvedValue([SERVICE_STUB]);

      await service.findAll();

      expect(prismaMock.service.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('busca serviços inativos quando active é "false"', async () => {
      prismaMock.service.findMany.mockResolvedValue([SERVICE_INATIVO_STUB]);

      await service.findAll('false');

      expect(prismaMock.service.findMany).toHaveBeenCalledWith({
        where: { active: false },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('busca serviços ativos para qualquer valor diferente de "false"', async () => {
      prismaMock.service.findMany.mockResolvedValue([SERVICE_STUB]);

      await service.findAll('true');

      expect(prismaMock.service.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('retorna a lista de serviços', async () => {
      prismaMock.service.findMany.mockResolvedValue([SERVICE_STUB]);

      const result = await service.findAll();

      expect(result).toEqual([SERVICE_STUB]);
    });

    it('retorna lista vazia quando não há serviços', async () => {
      prismaMock.service.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('busca o serviço pelo id e active:true por padrão', async () => {
      prismaMock.service.findFirst.mockResolvedValue(SERVICE_STUB);

      await service.findById('uuid-service-1');

      expect(prismaMock.service.findFirst).toHaveBeenCalledWith({
        where: { id: 'uuid-service-1', active: true },
      });
    });

    it('busca serviço inativo quando active é "false"', async () => {
      prismaMock.service.findFirst.mockResolvedValue(SERVICE_INATIVO_STUB);

      await service.findById('uuid-service-1', 'false');

      expect(prismaMock.service.findFirst).toHaveBeenCalledWith({
        where: { id: 'uuid-service-1', active: false },
      });
    });

    it('retorna o serviço quando existe', async () => {
      prismaMock.service.findFirst.mockResolvedValue(SERVICE_STUB);

      const result = await service.findById('uuid-service-1');

      expect(result).toEqual(SERVICE_STUB);
    });

    it('lança NotFoundException quando o serviço não existe', async () => {
      prismaMock.service.findFirst.mockResolvedValue(null);

      await expect(service.findById('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('cria o serviço com os dados do DTO', async () => {
      prismaMock.service.create.mockResolvedValue(SERVICE_STUB);
      const dto = makeCreateServiceDto();

      await service.create(dto);

      expect(prismaMock.service.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: dto.name,
          price: dto.price,
        }),
      });
    });

    it('usa duration do DTO quando informado', async () => {
      prismaMock.service.create.mockResolvedValue(SERVICE_STUB);

      await service.create(makeCreateServiceDto({ duration: 45 }));

      expect(prismaMock.service.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ duration: 45 }),
      });
    });

    it('usa duration 0 como fallback quando não é informado', async () => {
      prismaMock.service.create.mockResolvedValue(SERVICE_STUB);

      await service.create(makeCreateServiceDto({ duration: undefined }));

      expect(prismaMock.service.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ duration: 0 }),
      });
    });

    it('retorna o serviço criado', async () => {
      prismaMock.service.create.mockResolvedValue(SERVICE_STUB);

      const result = await service.create(makeCreateServiceDto());

      expect(result).toEqual(SERVICE_STUB);
    });
  });

  describe('update', () => {
    const setupHappyPath = () => {
      prismaMock.service.findUnique.mockResolvedValue(SERVICE_STUB);
      prismaMock.service.update.mockResolvedValue(SERVICE_STUB);
    };

    it('verifica se o serviço existe antes de atualizar', async () => {
      setupHappyPath();

      await service.update('uuid-service-1', makeCreateServiceDto());

      expect(prismaMock.service.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-service-1' },
      });
    });

    it('atualiza o serviço com os dados corretos', async () => {
      setupHappyPath();
      const dto = makeCreateServiceDto({ name: 'Corte Degradê' });

      await service.update('uuid-service-1', dto);

      expect(prismaMock.service.update).toHaveBeenCalledWith({
        where: { id: 'uuid-service-1' },
        data: dto,
      });
    });

    it('retorna o serviço atualizado', async () => {
      const servicoAtualizado = { ...SERVICE_STUB, name: 'Corte Degradê' };
      prismaMock.service.findUnique.mockResolvedValue(SERVICE_STUB);
      prismaMock.service.update.mockResolvedValue(servicoAtualizado);

      const result = await service.update('uuid-service-1', makeCreateServiceDto());

      expect(result).toEqual(servicoAtualizado);
    });

    it('lança BadRequestException quando o serviço não existe', async () => {
      prismaMock.service.findUnique.mockResolvedValue(null);

      await expect(
        service.update('id-inexistente', makeCreateServiceDto()),
      ).rejects.toThrow(BadRequestException);
    });

    it('não chama update quando o serviço não existe', async () => {
      prismaMock.service.findUnique.mockResolvedValue(null);

      await service.update('id-inexistente', makeCreateServiceDto()).catch(() => {});

      expect(prismaMock.service.update).not.toHaveBeenCalled();
    });
  });

  describe('desactivate', () => {
    it('desativa o serviço definindo active como false', async () => {
      prismaMock.service.update.mockResolvedValue({ ...SERVICE_STUB, active: false });

      await service.desactivate('uuid-service-1');

      expect(prismaMock.service.update).toHaveBeenCalledWith({
        where: { id: 'uuid-service-1' },
        data: { active: false },
      });
    });

    it('retorna o serviço desativado', async () => {
      const servicoDesativado = { ...SERVICE_STUB, active: false };
      prismaMock.service.update.mockResolvedValue(servicoDesativado);

      const result = await service.desactivate('uuid-service-1');

      expect(result).toEqual(servicoDesativado);
    });
  });
});