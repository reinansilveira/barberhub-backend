import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';

import { ProfessionalService } from '../../../src/modules/professionals/professionals.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';

import { makePrismaMock } from '../../mocks/services/prisma.mock';
import { makeCreateProfessionalDto } from '../../mocks/factories/professional.factory';
import {
  PROFESSIONAL_STUB,
  PROFESSIONAL_INATIVO_STUB,
} from '../../mocks/stubs/professional.stub';
import { USER_STUB } from '../../mocks/stubs/user.stub';

jest.mock('bcrypt');
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

const PROFESSIONAL_SAFE_USER_INCLUDE = {
  user: {
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  },
};

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
        include: PROFESSIONAL_SAFE_USER_INCLUDE,
      });
    });

    it('busca profissionais inativos quando active é "false"', async () => {
      prismaMock.professional.findMany.mockResolvedValue([PROFESSIONAL_INATIVO_STUB]);

      await service.findAll('false');

      expect(prismaMock.professional.findMany).toHaveBeenCalledWith({
        where: { active: false },
        orderBy: { createdAt: 'desc' },
        include: PROFESSIONAL_SAFE_USER_INCLUDE,
      });
    });

    it('busca profissionais ativos para qualquer valor diferente de "false"', async () => {
      prismaMock.professional.findMany.mockResolvedValue([PROFESSIONAL_STUB]);

      await service.findAll('true');

      expect(prismaMock.professional.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
        include: PROFESSIONAL_SAFE_USER_INCLUDE,
      });
    });

    it('inclui somente dados públicos do usuário vinculado', async () => {
      prismaMock.professional.findMany.mockResolvedValue([PROFESSIONAL_STUB]);

      await service.findAll();

      expect(prismaMock.professional.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ include: PROFESSIONAL_SAFE_USER_INCLUDE }),
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

  describe('getDashboard', () => {
    const professionalDashboardStub = {
      id: 'uuid-prof-1',
      specialty: 'Corte masculino',
      bio: 'Especialista em cortes degradê',
      experience: 5,
      commission: 40,
      rating: 4.8,
      totalReviews: 24,
      user: {
        name: 'Carlos Barbeiro',
        avatar: 'https://example.com/carlos.png',
      },
      appointments: [
        {
          id: 'appointment-completed',
          scheduledAt: new Date('2026-10-20T14:00:00Z'),
          startedAt: new Date('2026-10-20T14:00:00Z'),
          completedAt: new Date('2026-10-20T14:45:00Z'),
          status: AppointmentStatus.COMPLETED,
          duration: 45,
          price: 100,
          client: {
            id: 'client-1',
            user: { name: 'Maria Silva', avatar: null },
          },
          service: {
            id: 'service-1',
            name: 'Corte clássico',
            duration: 45,
            price: 100,
            category: 'Corte',
            image: null,
          },
        },
        {
          id: 'appointment-pending',
          scheduledAt: new Date('2026-10-21T14:00:00Z'),
          startedAt: null,
          completedAt: null,
          status: AppointmentStatus.PENDING,
          duration: 30,
          price: 80,
          client: {
            id: 'client-2',
            user: { name: 'João Santos', avatar: null },
          },
          service: {
            id: 'service-2',
            name: 'Barba',
            duration: 30,
            price: 80,
            category: 'Barba',
            image: null,
          },
        },
      ],
      professionalServices: [
        {
          active: true,
          customPrice: 90,
          customDuration: 50,
          service: {
            id: 'service-1',
            name: 'Corte clássico',
            description: 'Corte com acabamento',
            duration: 45,
            price: 100,
            category: 'Corte',
            image: null,
          },
        },
      ],
    };

    it('busca somente o profissional autenticado com campos públicos', async () => {
      prismaMock.professional.findFirst.mockResolvedValue(
        professionalDashboardStub,
      );

      await service.getDashboard('uuid-user-123');

      const query = prismaMock.professional.findFirst.mock.calls[0][0];
      expect(query.where).toEqual({
        userId: 'uuid-user-123',
        active: true,
        user: { is: { active: true } },
      });
      expect(query.select.user).toEqual({
        select: { name: true, avatar: true },
      });
      expect(query.select.appointments.select.client).toEqual({
        select: {
          id: true,
          user: { select: { name: true, avatar: true } },
        },
      });
      expect(JSON.stringify(query)).not.toMatch(/password|email|phone/);
    });

    it('retorna ganhos calculáveis pela comissão apenas dos atendimentos concluídos', async () => {
      prismaMock.professional.findFirst.mockResolvedValue(
        professionalDashboardStub,
      );

      const result = await service.getDashboard('uuid-user-123');

      expect(result.profile).toEqual({
        id: 'uuid-prof-1',
        name: 'Carlos Barbeiro',
        avatar: 'https://example.com/carlos.png',
        specialty: 'Corte masculino',
        bio: 'Especialista em cortes degradê',
        experience: 5,
        commissionRate: 40,
        rating: 4.8,
        totalReviews: 24,
      });
      expect(result.appointments[0]).toMatchObject({
        id: 'appointment-completed',
        price: 100,
        estimatedEarning: 40,
        client: { id: 'client-1', name: 'Maria Silva', avatar: null },
        service: { id: 'service-1', name: 'Corte clássico' },
      });
      expect(result.services[0]).toMatchObject({
        active: true,
        customPrice: 90,
        customDuration: 50,
        effectivePrice: 90,
        effectiveDuration: 50,
      });
      expect(result.earnings).toEqual({
        currency: 'BRL',
        commissionRate: 40,
        completedAppointments: 1,
        grossRevenue: 100,
        estimatedEarnings: 40,
        averageTicket: 100,
      });
    });

    it('bloqueia o dashboard para profissional inexistente ou inativo', async () => {
      prismaMock.professional.findFirst.mockResolvedValue(null);

      await expect(service.getDashboard('uuid-user-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createAccount', () => {
    const dto = {
      name: 'Enzo Ribeiro',
      email: 'ENZO@BARBERHUB.COM',
      phone: '+5511987654321',
      specialty: 'Cortes masculinos',
      bio: 'Especialista em degradê',
      experience: 5,
      commission: 35,
    };

    beforeEach(() => {
      prismaMock.user.findFirst.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({ id: 'uuid-user-new' });
      prismaMock.professional.create.mockResolvedValue(PROFESSIONAL_STUB);
      bcryptMock.hash.mockResolvedValue('$2b$10$hashedPassword' as never);
    });

    it('gera a senha no servidor, faz hash e cria usuário e profissional em transação', async () => {
      const result = await service.createAccount(dto);

      expect(bcryptMock.hash).toHaveBeenCalledWith(expect.any(String), 10);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: dto.name,
          email: 'enzo@barberhub.com',
          phone: dto.phone,
          password: '$2b$10$hashedPassword',
          role: 'PROFESSIONAL',
          passwordSetAt: expect.any(Date),
          roleAssignments: {
            create: { role: 'PROFESSIONAL' },
          },
        }),
      });
      expect(prismaMock.professional.create).toHaveBeenCalledWith({
        data: {
          userId: 'uuid-user-new',
          specialty: dto.specialty,
          bio: dto.bio,
          experience: dto.experience,
          commission: dto.commission,
        },
        include: PROFESSIONAL_SAFE_USER_INCLUDE,
      });
      expect(result).toEqual({
        professional: PROFESSIONAL_STUB,
        temporaryPassword: expect.any(String),
      });
    });

    it('bloqueia e-mail duplicado antes de gerar credenciais', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        email: 'enzo@barberhub.com',
        phone: null,
      });

      await expect(service.createAccount(dto)).rejects.toThrow(
        ConflictException,
      );
      expect(bcryptMock.hash).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('bloqueia telefone duplicado antes de gerar credenciais', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        email: 'outro@barberhub.com',
        phone: dto.phone,
      });

      await expect(service.createAccount(dto)).rejects.toThrow(
        ConflictException,
      );
      expect(bcryptMock.hash).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('converte conflito concorrente do banco em erro de negócio', async () => {
      prismaMock.$transaction.mockRejectedValueOnce(
        new PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(service.createAccount(dto)).rejects.toThrow(
        'Email ou telefone já cadastrado',
      );
    });
  });

  describe('findById', () => {
    it('busca o profissional pelo id com dados do usuário', async () => {
      prismaMock.professional.findFirst.mockResolvedValue(PROFESSIONAL_STUB);

      await service.findById('uuid-prof-1');

      expect(prismaMock.professional.findFirst).toHaveBeenCalledWith({
        where: { id: 'uuid-prof-1', active: true },
        include: PROFESSIONAL_SAFE_USER_INCLUDE,
      });
    });

    it('retorna o profissional quando existe', async () => {
      prismaMock.professional.findFirst.mockResolvedValue(PROFESSIONAL_STUB);

      const result = await service.findById('uuid-prof-1');

      expect(result).toEqual(PROFESSIONAL_STUB);
    });

    it('lança NotFoundException quando o profissional não existe', async () => {
      prismaMock.professional.findFirst.mockResolvedValue(null);

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
        include: PROFESSIONAL_SAFE_USER_INCLUDE,
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
        expect.objectContaining({ include: PROFESSIONAL_SAFE_USER_INCLUDE }),
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
