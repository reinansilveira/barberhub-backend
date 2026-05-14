import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { ProfessionalService } from '../../../src/modules/professionals/professionals.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';

import { makePrismaMock } from '../../mocks/services/prisma.mock';
import { makeCreateProfessionalDto } from '../../mocks/factories/professional.factory';
import {
  PROFESSIONAL_STUB,
  PROFESSIONAL_INATIVO_STUB,
} from '../../mocks/stubs/professional.stub';
import { USER_STUB } from '../../mocks/stubs/user.stub';

describe('ProfessionalService', () => {
  let service: ProfessionalService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prismaMock = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfessionalService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(ProfessionalService);
    jest.clearAllMocks();
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('busca profissionais ativos por padrão', async () => {
      prismaMock.professional.findMany.mockResolvedValue([PROFESSIONAL_STUB]);

      await service.findAll();

      expect(prismaMock.professional.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      });
    });

    it('busca profissionais inativos quando active é "false"', async () => {
      prismaMock.professional.findMany.mockResolvedValue([PROFESSIONAL_INATIVO_STUB]);

      await service.findAll('false');

      expect(prismaMock.professional.findMany).toHaveBeenCalledWith({
        where: { active: false },
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      });
    });

    it('busca profissionais ativos para qualquer valor diferente de "false"', async () => {
      prismaMock.professional.findMany.mockResolvedValue([PROFESSIONAL_STUB]);

      await service.findAll('true');

      expect(prismaMock.professional.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      });
    });

    it('inclui os dados do usuário vinculado', async () => {
      prismaMock.professional.findMany.mockResolvedValue([PROFESSIONAL_STUB]);

      await service.findAll();

      expect(prismaMock.professional.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ include: { user: true } }),
      );
    });

    it('retorna a lista de profissionais', async () => {
      prismaMock.professional.findMany.mockResolvedValue([PROFESSIONAL_STUB]);

      const result = await service.findAll();

      expect(result).toEqual([PROFESSIONAL_STUB]);
    });

    it('retorna lista vazia quando não há profissionais', async () => {
      prismaMock.professional.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('busca o profissional pelo id com dados do usuário', async () => {
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);

      await service.findById('uuid-prof-1');

      expect(prismaMock.professional.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-prof-1' },
        include: { user: true },
      });
    });

    it('retorna o profissional quando existe', async () => {
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);

      const result = await service.findById('uuid-prof-1');

      expect(result).toEqual(PROFESSIONAL_STUB);
    });

    it('lança NotFoundException quando o profissional não existe', async () => {
      prismaMock.professional.findUnique.mockResolvedValue(null);

      await expect(service.findById('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const setupHappyPath = () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      prismaMock.professional.findUnique.mockResolvedValue(null);
      prismaMock.professional.create.mockResolvedValue(PROFESSIONAL_STUB);
    };

    it('verifica se o usuário existe antes de criar', async () => {
      setupHappyPath();
      const dto = makeCreateProfessionalDto();

      await service.create(dto);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: dto.userId },
      });
    });

    it('verifica se o usuário já é profissional', async () => {
      setupHappyPath();
      const dto = makeCreateProfessionalDto();

      await service.create(dto);

      expect(prismaMock.professional.findUnique).toHaveBeenCalledWith({
        where: { userId: dto.userId },
      });
    });

    it('cria o profissional com os dados corretos do DTO', async () => {
      setupHappyPath();
      const dto = makeCreateProfessionalDto();

      await service.create(dto);

      expect(prismaMock.professional.create).toHaveBeenCalledWith({
        data: {
          userId: dto.userId,
          specialty: dto.specialty,
          bio: dto.bio,
          experience: dto.experience,
          commission: dto.commission,
        },
        include: { user: true },
      });
    });

    it('retorna o profissional criado com dados do usuário', async () => {
      setupHappyPath();

      const result = await service.create(makeCreateProfessionalDto());

      expect(result).toEqual(PROFESSIONAL_STUB);
    });

    it('lança BadRequestException quando o usuário não existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.create(makeCreateProfessionalDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('não verifica duplicidade quando o usuário não existe', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await service.create(makeCreateProfessionalDto()).catch(() => {});

      expect(prismaMock.professional.findUnique).not.toHaveBeenCalled();
    });

    it('lança BadRequestException quando o usuário já é profissional', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);

      await expect(service.create(makeCreateProfessionalDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('não cria quando o usuário já é profissional', async () => {
      prismaMock.user.findUnique.mockResolvedValue(USER_STUB);
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);

      await service.create(makeCreateProfessionalDto()).catch(() => {});

      expect(prismaMock.professional.create).not.toHaveBeenCalled();
    });
  });


  describe('update', () => {
    const setupHappyPath = () => {
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);
      prismaMock.professional.update.mockResolvedValue(PROFESSIONAL_STUB);
    };

    it('verifica se o profissional existe antes de atualizar', async () => {
      setupHappyPath();

      await service.update('uuid-prof-1', makeCreateProfessionalDto());

      expect(prismaMock.professional.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-prof-1' },
      });
    });

    it('atualiza apenas os campos permitidos — não atualiza userId', async () => {
      setupHappyPath();
      const dto = makeCreateProfessionalDto({ specialty: 'Barba' });

      await service.update('uuid-prof-1', dto);

      const chamada = prismaMock.professional.update.mock.calls[0][0];

      expect(chamada.data).not.toHaveProperty('userId');
      expect(chamada.data).toEqual({
        specialty: dto.specialty,
        bio: dto.bio,
        experience: dto.experience,
        commission: dto.commission,
      });
    });

    it('inclui dados do usuário no retorno', async () => {
      setupHappyPath();

      await service.update('uuid-prof-1', makeCreateProfessionalDto());

      expect(prismaMock.professional.update).toHaveBeenCalledWith(
        expect.objectContaining({ include: { user: true } }),
      );
    });

    it('retorna o profissional atualizado', async () => {
      const profAtualizado = { ...PROFESSIONAL_STUB, specialty: 'Barba' };
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);
      prismaMock.professional.update.mockResolvedValue(profAtualizado);

      const result = await service.update('uuid-prof-1', makeCreateProfessionalDto());

      expect(result).toEqual(profAtualizado);
    });

    it('lança NotFoundException quando o profissional não existe', async () => {
      prismaMock.professional.findUnique.mockResolvedValue(null);

      await expect(
        service.update('id-inexistente', makeCreateProfessionalDto()),
      ).rejects.toThrow(NotFoundException);
    });

    it('não chama update quando o profissional não existe', async () => {
      prismaMock.professional.findUnique.mockResolvedValue(null);

      await service.update('id-inexistente', makeCreateProfessionalDto()).catch(() => {});

      expect(prismaMock.professional.update).not.toHaveBeenCalled();
    });
  });


  describe('deactivate', () => {
    it('verifica se o profissional existe antes de desativar', async () => {
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);
      prismaMock.professional.update.mockResolvedValue({
        ...PROFESSIONAL_STUB,
        active: false,
      });

      await service.deactivate('uuid-prof-1');

      expect(prismaMock.professional.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-prof-1' },
      });
    });

    it('desativa o profissional definindo active como false', async () => {
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);
      prismaMock.professional.update.mockResolvedValue({
        ...PROFESSIONAL_STUB,
        active: false,
      });

      await service.deactivate('uuid-prof-1');

      expect(prismaMock.professional.update).toHaveBeenCalledWith({
        where: { id: 'uuid-prof-1' },
        data: { active: false },
      });
    });

    it('retorna o profissional desativado', async () => {
      const profDesativado = { ...PROFESSIONAL_STUB, active: false };
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);
      prismaMock.professional.update.mockResolvedValue(profDesativado);

      const result = await service.deactivate('uuid-prof-1');

      expect(result).toEqual(profDesativado);
    });

    it('lança NotFoundException quando o profissional não existe', async () => {
      prismaMock.professional.findUnique.mockResolvedValue(null);

      await expect(service.deactivate('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('não chama update quando o profissional não existe', async () => {
      prismaMock.professional.findUnique.mockResolvedValue(null);

      await service.deactivate('id-inexistente').catch(() => {});

      expect(prismaMock.professional.update).not.toHaveBeenCalled();
    });
  });
});