import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';

import { ProfessionalServicesService } from '../../../src/modules/professional-services/professional-services.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';

import { makePrismaMock } from '../../mocks/services/prisma.mock';
import {
  makeCreateProfessionalServiceDto,
  makeUpdateProfessionalServiceDto,
} from '../../mocks/factories/professional-service.factory';
import {
  PROFESSIONAL_SERVICE_STUB,
  PROFESSIONAL_SERVICE_COM_CUSTOM_STUB,
  PROFESSIONAL_SERVICE_INATIVO_STUB,
} from '../../mocks/stubs/professional-service.stub';
import { PROFESSIONAL_STUB } from '../../mocks/stubs/professional.stub';
import { SERVICE_STUB } from '../../mocks/stubs/service.stub';

describe('ProfessionalServicesService', () => {
  let service: ProfessionalServicesService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prismaMock = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfessionalServicesService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(ProfessionalServicesService);
    jest.clearAllMocks();
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('busca vínculos ativos sem filtro de profissional por padrão', async () => {
      prismaMock.professionalService.findMany.mockResolvedValue([PROFESSIONAL_SERVICE_STUB]);

      await service.findAll();

      expect(prismaMock.professionalService.findMany).toHaveBeenCalledWith({
        where: { professionalId: undefined, active: true },
        include: { service: true, professional: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('filtra por professionalId quando informado', async () => {
      prismaMock.professionalService.findMany.mockResolvedValue([PROFESSIONAL_SERVICE_STUB]);

      await service.findAll('uuid-prof-1');

      expect(prismaMock.professionalService.findMany).toHaveBeenCalledWith({
        where: { professionalId: 'uuid-prof-1', active: true },
        include: { service: true, professional: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('busca vínculos inativos quando active é "false"', async () => {
      prismaMock.professionalService.findMany.mockResolvedValue([PROFESSIONAL_SERVICE_INATIVO_STUB]);

      await service.findAll(undefined, 'false');

      expect(prismaMock.professionalService.findMany).toHaveBeenCalledWith({
        where: { professionalId: undefined, active: false },
        include: { service: true, professional: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('trata string vazia de professionalId como undefined', async () => {
      prismaMock.professionalService.findMany.mockResolvedValue([PROFESSIONAL_SERVICE_STUB]);

      await service.findAll('');

      expect(prismaMock.professionalService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ professionalId: undefined }),
        }),
      );
    });

    it('inclui service e professional no retorno', async () => {
      prismaMock.professionalService.findMany.mockResolvedValue([PROFESSIONAL_SERVICE_STUB]);

      await service.findAll();

      expect(prismaMock.professionalService.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { service: true, professional: true },
        }),
      );
    });

    it('retorna a lista de vínculos', async () => {
      prismaMock.professionalService.findMany.mockResolvedValue([PROFESSIONAL_SERVICE_STUB]);

      const result = await service.findAll();

      expect(result).toEqual([PROFESSIONAL_SERVICE_STUB]);
    });

    it('retorna lista vazia quando não há vínculos', async () => {
      prismaMock.professionalService.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const setupHappyPath = () => {
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);
      prismaMock.service.findUnique.mockResolvedValue(SERVICE_STUB);
      prismaMock.professionalService.findUnique.mockResolvedValue(null);
      prismaMock.professionalService.create.mockResolvedValue(PROFESSIONAL_SERVICE_STUB);
    };

    it('verifica se o profissional existe antes de criar', async () => {
      setupHappyPath();
      const dto = makeCreateProfessionalServiceDto();

      await service.create(dto);

      expect(prismaMock.professional.findUnique).toHaveBeenCalledWith({
        where: { id: dto.professionalId },
      });
    });

    it('verifica se o serviço existe antes de criar', async () => {
      setupHappyPath();
      const dto = makeCreateProfessionalServiceDto();

      await service.create(dto);

      expect(prismaMock.service.findUnique).toHaveBeenCalledWith({
        where: { id: dto.serviceId },
      });
    });

    it('verifica duplicidade pela chave composta professionalId + serviceId', async () => {
      setupHappyPath();
      const dto = makeCreateProfessionalServiceDto();

      await service.create(dto);

      expect(prismaMock.professionalService.findUnique).toHaveBeenCalledWith({
        where: {
          professionalId_serviceId: {
            professionalId: dto.professionalId,
            serviceId: dto.serviceId,
          },
        },
      });
    });

    it('cria o vínculo com todos os dados do DTO', async () => {
      setupHappyPath();
      const dto = makeCreateProfessionalServiceDto();

      await service.create(dto);

      expect(prismaMock.professionalService.create).toHaveBeenCalledWith({
        data: dto,
      });
    });

    it('cria vínculo com customPrice quando informado', async () => {
      setupHappyPath();
      prismaMock.professionalService.create.mockResolvedValue(
        PROFESSIONAL_SERVICE_COM_CUSTOM_STUB,
      );

      const result = await service.create(
        makeCreateProfessionalServiceDto({ customPrice: 60.0 }),
      );

      expect(result.customPrice).toBe(60.0);
    });

    it('retorna o vínculo criado', async () => {
      setupHappyPath();

      const result = await service.create(makeCreateProfessionalServiceDto());

      expect(result).toEqual(PROFESSIONAL_SERVICE_STUB);
    });

    it('lança BadRequestException quando o profissional não existe', async () => {
      prismaMock.professional.findUnique.mockResolvedValue(null);

      await expect(
        service.create(makeCreateProfessionalServiceDto()),
      ).rejects.toThrow(BadRequestException);
    });

    it('não verifica serviço quando profissional não existe', async () => {
      prismaMock.professional.findUnique.mockResolvedValue(null);

      await service.create(makeCreateProfessionalServiceDto()).catch(() => {});

      // Garante que o service para no primeiro guard — sem queries extras.
      expect(prismaMock.service.findUnique).not.toHaveBeenCalled();
    });

    it('lança BadRequestException quando o serviço não existe', async () => {
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);
      prismaMock.service.findUnique.mockResolvedValue(null);

      await expect(
        service.create(makeCreateProfessionalServiceDto()),
      ).rejects.toThrow(BadRequestException);
    });

    it('não verifica duplicidade quando o serviço não existe', async () => {
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);
      prismaMock.service.findUnique.mockResolvedValue(null);

      await service.create(makeCreateProfessionalServiceDto()).catch(() => {});

      expect(prismaMock.professionalService.findUnique).not.toHaveBeenCalled();
    });

    it('lança ConflictException quando o vínculo já existe', async () => {
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);
      prismaMock.service.findUnique.mockResolvedValue(SERVICE_STUB);
      prismaMock.professionalService.findUnique.mockResolvedValue(PROFESSIONAL_SERVICE_STUB);

      await expect(
        service.create(makeCreateProfessionalServiceDto()),
      ).rejects.toThrow(ConflictException);
    });

    it('não cria quando vínculo já existe', async () => {
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);
      prismaMock.service.findUnique.mockResolvedValue(SERVICE_STUB);
      prismaMock.professionalService.findUnique.mockResolvedValue(PROFESSIONAL_SERVICE_STUB);

      await service.create(makeCreateProfessionalServiceDto()).catch(() => {});

      expect(prismaMock.professionalService.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const CHAVE = {
      professionalId: 'uuid-prof-1',
      serviceId: 'uuid-service-1',
    };

    const setupHappyPath = () => {
      prismaMock.professionalService.findUnique.mockResolvedValue(PROFESSIONAL_SERVICE_STUB);
      prismaMock.professionalService.update.mockResolvedValue(
        PROFESSIONAL_SERVICE_COM_CUSTOM_STUB,
      );
    };

    it('busca o vínculo pela chave composta antes de atualizar', async () => {
      setupHappyPath();

      await service.update(CHAVE.professionalId, CHAVE.serviceId, makeUpdateProfessionalServiceDto());

      expect(prismaMock.professionalService.findUnique).toHaveBeenCalledWith({
        where: {
          professionalId_serviceId: CHAVE,
        },
      });
    });

    it('atualiza o vínculo com os dados corretos', async () => {
      setupHappyPath();
      const dto = makeUpdateProfessionalServiceDto({ customPrice: 75.0, customDuration: 60 });

      await service.update(CHAVE.professionalId, CHAVE.serviceId, dto);

      expect(prismaMock.professionalService.update).toHaveBeenCalledWith({
        where: { professionalId_serviceId: CHAVE },
        data: dto,
      });
    });

    it('retorna o vínculo atualizado', async () => {
      setupHappyPath();

      const result = await service.update(
        CHAVE.professionalId,
        CHAVE.serviceId,
        makeUpdateProfessionalServiceDto(),
      );

      expect(result).toEqual(PROFESSIONAL_SERVICE_COM_CUSTOM_STUB);
    });

    it('lança BadRequestException quando o vínculo não existe', async () => {
      prismaMock.professionalService.findUnique.mockResolvedValue(null);

      await expect(
        service.update(CHAVE.professionalId, CHAVE.serviceId, makeUpdateProfessionalServiceDto()),
      ).rejects.toThrow(BadRequestException);
    });

    it('não chama update quando o vínculo não existe', async () => {
      prismaMock.professionalService.findUnique.mockResolvedValue(null);

      await service.update(
        CHAVE.professionalId,
        CHAVE.serviceId,
        makeUpdateProfessionalServiceDto(),
      ).catch(() => {});

      expect(prismaMock.professionalService.update).not.toHaveBeenCalled();
    });
  });

  describe('desactivate', () => {
    it('desativa o vínculo pela chave composta', async () => {
      prismaMock.professionalService.update.mockResolvedValue(PROFESSIONAL_SERVICE_INATIVO_STUB);

      await service.desactivate('uuid-prof-1', 'uuid-service-1');

      expect(prismaMock.professionalService.update).toHaveBeenCalledWith({
        where: {
          professionalId_serviceId: {
            professionalId: 'uuid-prof-1',
            serviceId: 'uuid-service-1',
          },
        },
        data: { active: false },
      });
    });

    it('retorna o vínculo desativado', async () => {
      prismaMock.professionalService.update.mockResolvedValue(PROFESSIONAL_SERVICE_INATIVO_STUB);

      const result = await service.desactivate('uuid-prof-1', 'uuid-service-1');

      expect(result).toEqual(PROFESSIONAL_SERVICE_INATIVO_STUB);
    });
  });
});