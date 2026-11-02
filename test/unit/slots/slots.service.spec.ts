import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { SlotsService } from '../../../src/modules/slots/slots.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';

import { makePrismaMock } from '../../mocks/services/prisma.mock';
import {
  makeCreateSlotDto,
  makeCreateSlotBatchDto,
} from '../../mocks/factories/slot.factory';
import {
  SLOT_DISPONIVEL_STUB,
  SLOT_OCUPADO_STUB,
  SLOT_RESULT_STUB,
  SCHEDULE_STUB,
} from '../../mocks/stubs/slot.stub';

describe('SlotsService', () => {
  let service: SlotsService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prismaMock = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(SlotsService);
    jest.clearAllMocks();
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('lança BadRequestException quando nem startsAt nem slots são informados', async () => {
      await expect(
        service.create({ professionalId: 'uuid-prof-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('cria um único slot quando startsAt é informado sem slots', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([SCHEDULE_STUB]);
      prismaMock.timeSlot.findUnique.mockResolvedValue(null);
      prismaMock.timeSlot.create.mockResolvedValue(SLOT_RESULT_STUB);

      const result = await service.create(makeCreateSlotDto());

      expect(result).toEqual(SLOT_RESULT_STUB);
      expect(result).not.toHaveProperty('created');
      expect(result).not.toHaveProperty('skipped');
    });

    it('cria em batch quando slots é informado com múltiplos horários', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([SCHEDULE_STUB]);
      prismaMock.timeSlot.findUnique.mockResolvedValue(null);
      prismaMock.timeSlot.create
        .mockResolvedValueOnce({
          id: 'uuid-slot-1',
          startsAt: new Date('2024-06-01T10:00:00Z'),
        })
        .mockResolvedValueOnce({
          id: 'uuid-slot-2',
          startsAt: new Date('2024-06-01T11:00:00Z'),
        })
        .mockResolvedValueOnce({
          id: 'uuid-slot-3',
          startsAt: new Date('2024-06-01T12:00:00Z'),
        });

      const result = (await service.create(makeCreateSlotBatchDto())) as any;

      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('skipped');
      expect(result.created).toHaveLength(3);
      expect(result.skipped).toHaveLength(0);
    });

    it('usa slots quando ambos startsAt e slots são informados', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([SCHEDULE_STUB]);
      prismaMock.timeSlot.findUnique.mockResolvedValue(null);
      prismaMock.timeSlot.create
        .mockResolvedValueOnce({
          id: 'uuid-slot-1',
          startsAt: new Date('2024-06-01T10:00:00Z'),
        })
        .mockResolvedValueOnce({
          id: 'uuid-slot-2',
          startsAt: new Date('2024-06-01T11:00:00Z'),
        });

      const result = (await service.create({
        professionalId: 'uuid-prof-1',
        startsAt: '2024-06-01T09:00:00Z',
        slots: ['2024-06-01T10:00:00Z', '2024-06-01T11:00:00Z'],
      })) as any;

      expect(result).toHaveProperty('created');
      expect(result.created).toHaveLength(2);
    });
  });

  describe('createOne', () => {
    const setupHappyPath = () => {
      prismaMock.schedule.findMany.mockResolvedValue([SCHEDULE_STUB]);
      prismaMock.timeSlot.findUnique.mockResolvedValue(null);
      prismaMock.timeSlot.create.mockResolvedValue(SLOT_RESULT_STUB);
    };

    it('busca o schedule ativo do profissional para o dia da semana correto', async () => {
      setupHappyPath();
      const dto = makeCreateSlotDto({ startsAt: '2024-06-01T10:00:00Z' });

      await service.create(dto);

      expect(prismaMock.schedule.findMany).toHaveBeenCalledWith({
        where: {
          professionalId: dto.professionalId,
          active: true,
          OR: [
            { dayOfWeek: expect.any(Number), date: null },
            { date: { gte: expect.any(Date), lt: expect.any(Date) } },
          ],
        },
      });
    });

    it('cria o slot com professionalId e startsAt corretos', async () => {
      setupHappyPath();
      const dto = makeCreateSlotDto({ startsAt: '2024-06-01T10:00:00Z' });

      await service.create(dto);

      expect(prismaMock.timeSlot.create).toHaveBeenCalledWith({
        data: {
          professionalId: dto.professionalId,
          startsAt: new Date(dto.startsAt!),
        },
        select: { id: true, startsAt: true },
      });
    });

    it('retorna apenas id e startsAt — não expõe dados internos', async () => {
      setupHappyPath();

      const result = await service.create(makeCreateSlotDto());

      expect(Object.keys(result)).toEqual(
        expect.arrayContaining(['id', 'startsAt']),
      );
      expect(result).not.toHaveProperty('professionalId');
      expect(result).not.toHaveProperty('available');
    });

    it('lança BadRequestException quando o profissional não trabalha neste dia', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([]);

      await expect(service.create(makeCreateSlotDto())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lança ConflictException quando já existe slot neste horário', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([SCHEDULE_STUB]);
      prismaMock.timeSlot.findUnique.mockResolvedValue(SLOT_DISPONIVEL_STUB);

      await expect(service.create(makeCreateSlotDto())).rejects.toThrow(
        ConflictException,
      );
    });

    it('não cria o slot quando já existe conflito de horário', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([SCHEDULE_STUB]);
      prismaMock.timeSlot.findUnique.mockResolvedValue(SLOT_DISPONIVEL_STUB);

      await service.create(makeCreateSlotDto()).catch(() => {});

      expect(prismaMock.timeSlot.create).not.toHaveBeenCalled();
    });
  });

  describe('createMany', () => {
    it('cria todos os slots quando todos são válidos', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([SCHEDULE_STUB]);
      prismaMock.timeSlot.findUnique.mockResolvedValue(null);
      prismaMock.timeSlot.create
        .mockResolvedValueOnce({
          id: 'uuid-slot-1',
          startsAt: new Date('2024-06-01T10:00:00Z'),
        })
        .mockResolvedValueOnce({
          id: 'uuid-slot-2',
          startsAt: new Date('2024-06-01T11:00:00Z'),
        })
        .mockResolvedValueOnce({
          id: 'uuid-slot-3',
          startsAt: new Date('2024-06-01T12:00:00Z'),
        });

      const result = (await service.create(makeCreateSlotBatchDto())) as any;

      expect(result.created).toHaveLength(3);
      expect(result.skipped).toHaveLength(0);
    });

    it('coloca no skipped os slots que falharem sem parar o batch', async () => {
      prismaMock.schedule.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([SCHEDULE_STUB])
        .mockResolvedValueOnce([SCHEDULE_STUB]);

      prismaMock.timeSlot.findUnique
        .mockResolvedValueOnce(SLOT_DISPONIVEL_STUB)
        .mockResolvedValueOnce(null);

      prismaMock.timeSlot.create.mockResolvedValue({
        id: 'uuid-slot-3',
        startsAt: new Date('2024-06-01T12:00:00Z'),
      });

      const result = (await service.create(makeCreateSlotBatchDto())) as any;

      expect(result.created).toHaveLength(1);
      expect(result.skipped).toHaveLength(2);
    });

    it('registra a mensagem de erro correta no skipped', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([]);
      prismaMock.timeSlot.findUnique.mockResolvedValue(null);
      prismaMock.timeSlot.create.mockResolvedValue(SLOT_RESULT_STUB);

      const result = (await service.create(
        makeCreateSlotBatchDto({
          slots: ['2024-06-01T10:00:00Z', '2024-06-01T11:00:00Z'],
        }),
      )) as any;

      expect(result.skipped[0]).toEqual({
        startsAt: '2024-06-01T10:00:00Z',
        reason: 'Horário fora do expediente ou intervalo do profissional',
      });
    });

    it('registra "Erro desconhecido" para erros que não são HttpException', async () => {
      prismaMock.schedule.findMany.mockRejectedValue(
        new Error('DB connection lost'),
      );

      const result = (await service.create(
        makeCreateSlotBatchDto({
          slots: ['2024-06-01T10:00:00Z', '2024-06-01T11:00:00Z'],
        }),
      )) as any;

      expect(result.skipped[0].reason).toBe('Erro desconhecido');
    });

    it('retorna o slot criado quando recebe apenas um horário', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([SCHEDULE_STUB]);
      prismaMock.timeSlot.findUnique.mockResolvedValue(null);
      prismaMock.timeSlot.create.mockResolvedValue(SLOT_RESULT_STUB);

      const result = (await service.create({
        professionalId: 'uuid-prof-1',
        slots: ['2024-06-01T10:00:00Z'],
      })) as any;

      expect(result).toEqual(SLOT_RESULT_STUB);
    });
  });

  describe('findAvailable', () => {
    it('busca slots disponíveis do profissional na data informada', async () => {
      prismaMock.timeSlot.findMany.mockResolvedValue([SLOT_RESULT_STUB]);

      await service.findAvailable('uuid-prof-1', '2024-06-01');

      expect(prismaMock.timeSlot.findMany).toHaveBeenCalledWith({
        where: {
          professionalId: 'uuid-prof-1',
          available: true,
          startsAt: {
            gte: new Date('2024-06-01T00:00:00'),
            lte: new Date('2024-06-01T23:59:59'),
          },
        },
        orderBy: { startsAt: 'asc' },
        select: { id: true, startsAt: true },
      });
    });

    it('retorna apenas slots do dia inteiro (00:00 até 23:59)', async () => {
      prismaMock.timeSlot.findMany.mockResolvedValue([SLOT_RESULT_STUB]);

      await service.findAvailable('uuid-prof-1', '2024-06-01');

      const chamada = prismaMock.timeSlot.findMany.mock.calls[0][0];
      const { gte, lte } = chamada.where.startsAt;

      expect(gte.getHours()).toBe(0);
      expect(gte.getMinutes()).toBe(0);
      expect(lte.getHours()).toBe(23);
      expect(lte.getMinutes()).toBe(59);
    });

    it('ordena os slots por horário crescente', async () => {
      prismaMock.timeSlot.findMany.mockResolvedValue([SLOT_RESULT_STUB]);

      await service.findAvailable('uuid-prof-1', '2024-06-01');

      expect(prismaMock.timeSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { startsAt: 'asc' },
        }),
      );
    });

    it('retorna lista vazia quando não há slots disponíveis', async () => {
      prismaMock.timeSlot.findMany.mockResolvedValue([]);

      const result = await service.findAvailable('uuid-prof-1', '2024-06-01');

      expect(result).toEqual([]);
    });

    it('retorna apenas id e startsAt de cada slot', async () => {
      prismaMock.timeSlot.findMany.mockResolvedValue([SLOT_RESULT_STUB]);

      await service.findAvailable('uuid-prof-1', '2024-06-01');

      expect(prismaMock.timeSlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: { id: true, startsAt: true },
        }),
      );
    });
  });

  describe('delete', () => {
    it('busca o slot pelo id antes de deletar', async () => {
      prismaMock.timeSlot.findUnique.mockResolvedValue(SLOT_DISPONIVEL_STUB);
      prismaMock.timeSlot.delete.mockResolvedValue(SLOT_DISPONIVEL_STUB);

      await service.delete('uuid-slot-1');

      expect(prismaMock.timeSlot.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-slot-1' },
      });
    });

    it('deleta o slot disponível com sucesso', async () => {
      prismaMock.timeSlot.findUnique.mockResolvedValue(SLOT_DISPONIVEL_STUB);
      prismaMock.timeSlot.delete.mockResolvedValue(SLOT_DISPONIVEL_STUB);

      await service.delete('uuid-slot-1');

      expect(prismaMock.timeSlot.delete).toHaveBeenCalledWith({
        where: { id: 'uuid-slot-1' },
      });
    });

    it('retorna void após deletar', async () => {
      prismaMock.timeSlot.findUnique.mockResolvedValue(SLOT_DISPONIVEL_STUB);
      prismaMock.timeSlot.delete.mockResolvedValue(SLOT_DISPONIVEL_STUB);

      const result = await service.delete('uuid-slot-1');

      expect(result).toBeUndefined();
    });

    it('lança NotFoundException quando o slot não existe', async () => {
      prismaMock.timeSlot.findUnique.mockResolvedValue(null);

      await expect(service.delete('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lança BadRequestException quando o slot está ocupado', async () => {
      prismaMock.timeSlot.findUnique.mockResolvedValue(SLOT_OCUPADO_STUB);

      await expect(service.delete('uuid-slot-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('não deleta quando o slot está ocupado', async () => {
      prismaMock.timeSlot.findUnique.mockResolvedValue(SLOT_OCUPADO_STUB);

      await service.delete('uuid-slot-1').catch(() => {});

      expect(prismaMock.timeSlot.delete).not.toHaveBeenCalled();
    });

    it('não deleta quando o slot não existe', async () => {
      prismaMock.timeSlot.findUnique.mockResolvedValue(null);

      await service.delete('id-inexistente').catch(() => {});

      expect(prismaMock.timeSlot.delete).not.toHaveBeenCalled();
    });
  });
});
