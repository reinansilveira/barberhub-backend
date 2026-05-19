import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import { ScheduleService } from '../../../src/modules/schedule/schedule.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';

import { makePrismaMock } from '../../mocks/services/prisma.mock';
import { makeCreateScheduleDto, makeScheduleItemDto } from '../../mocks/factories/schedule.factory';
import {
  SCHEDULE_STUB,
  SCHEDULE_INATIVO_STUB,
  SCHEDULE_POR_DATA_STUB,
} from '../../mocks/stubs/schedule.stub';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prismaMock = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(ScheduleService);
    jest.clearAllMocks();
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('busca schedules ativos quando nenhum filtro é informado', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([SCHEDULE_STUB]);

      await service.findAll();

      expect(prismaMock.schedule.findMany).toHaveBeenCalledWith({
        where: { professionalId: undefined, active: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });

    it('filtra por professionalId quando informado', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([SCHEDULE_STUB]);

      await service.findAll('uuid-prof-1');

      expect(prismaMock.schedule.findMany).toHaveBeenCalledWith({
        where: { professionalId: 'uuid-prof-1', active: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });

    it('busca schedules inativos quando active é "false"', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([SCHEDULE_INATIVO_STUB]);

      await service.findAll(undefined, 'false');

      expect(prismaMock.schedule.findMany).toHaveBeenCalledWith({
        where: { professionalId: undefined, active: false },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });
    });

    it('ordena por dayOfWeek e startTime crescente', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([SCHEDULE_STUB]);

      await service.findAll();

      expect(prismaMock.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        }),
      );
    });

    it('trata string vazia de professionalId como undefined', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([SCHEDULE_STUB]);

      await service.findAll('');

      expect(prismaMock.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ professionalId: undefined }),
        }),
      );
    });

    it('retorna a lista de schedules', async () => {
      prismaMock.schedule.findMany.mockResolvedValue([SCHEDULE_STUB]);

      const result = await service.findAll();

      expect(result).toEqual([SCHEDULE_STUB]);
    });
  });

  describe('findById', () => {
    it('busca o schedule pelo id exato', async () => {
      prismaMock.schedule.findUnique.mockResolvedValue(SCHEDULE_STUB);

      await service.findById('uuid-schedule-1');

      expect(prismaMock.schedule.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-schedule-1' },
      });
    });

    it('retorna o schedule quando existe', async () => {
      prismaMock.schedule.findUnique.mockResolvedValue(SCHEDULE_STUB);

      const result = await service.findById('uuid-schedule-1');

      expect(result).toEqual(SCHEDULE_STUB);
    });

    it('lança BadRequestException quando o schedule não existe', async () => {
      prismaMock.schedule.findUnique.mockResolvedValue(null);

      await expect(service.findById('id-inexistente')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('create', () => {
    it('lança BadRequestException quando schedules é array vazio', async () => {
      await expect(
        service.create(makeCreateScheduleDto({ schedules: [] })),
      ).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException quando schedules não é informado', async () => {
      await expect(
        service.create({ professionalId: 'uuid-prof-1', schedules: undefined as any }),
      ).rejects.toThrow(BadRequestException);
    });

    it('cria um schedule para cada item do array', async () => {
      prismaMock.schedule.create
        .mockResolvedValueOnce(SCHEDULE_STUB)
        .mockResolvedValueOnce({ ...SCHEDULE_STUB, id: 'uuid-schedule-2', dayOfWeek: 2 });

      const dto = makeCreateScheduleDto({
        schedules: [
          makeScheduleItemDto({ dayOfWeek: 1 }),
          makeScheduleItemDto({ dayOfWeek: 2 }),
        ],
      });

      const result = await service.create(dto);

      expect(prismaMock.schedule.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it('cria o schedule com os dados corretos do item', async () => {
      prismaMock.schedule.create.mockResolvedValue(SCHEDULE_STUB);
      const dto = makeCreateScheduleDto();

      await service.create(dto);

      expect(prismaMock.schedule.create).toHaveBeenCalledWith({
        data: {
          professionalId: dto.professionalId,
          dayOfWeek: dto.schedules[0].dayOfWeek,
          date: null,
          startTime: dto.schedules[0].startTime,
          endTime: dto.schedules[0].endTime,
          breakStart: dto.schedules[0].breakStart,
          breakEnd: dto.schedules[0].breakEnd,
          active: true,
        },
      });
    });

    it('converte date string para objeto Date quando informado', async () => {
      prismaMock.schedule.create.mockResolvedValue(SCHEDULE_POR_DATA_STUB);

      await service.create(
        makeCreateScheduleDto({
          schedules: [makeScheduleItemDto({ date: '2026-02-19', dayOfWeek: undefined })],
        }),
      );

      expect(prismaMock.schedule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          date: new Date('2026-02-19'),
        }),
      });
    });

    it('define date como null quando não é informado', async () => {
      prismaMock.schedule.create.mockResolvedValue(SCHEDULE_STUB);

      await service.create(makeCreateScheduleDto({
        schedules: [makeScheduleItemDto({ date: undefined })],
      }));

      expect(prismaMock.schedule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ date: null }),
      });
    });

    it('define dayOfWeek como null quando não é informado', async () => {
      prismaMock.schedule.create.mockResolvedValue(SCHEDULE_POR_DATA_STUB);

      await service.create(makeCreateScheduleDto({
        schedules: [makeScheduleItemDto({ dayOfWeek: undefined })],
      }));

      expect(prismaMock.schedule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ dayOfWeek: null }),
      });
    });

    it('define breakStart e breakEnd como null quando não são informados', async () => {
      prismaMock.schedule.create.mockResolvedValue(SCHEDULE_STUB);

      await service.create(makeCreateScheduleDto({
        schedules: [makeScheduleItemDto({ breakStart: undefined, breakEnd: undefined })],
      }));

      expect(prismaMock.schedule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          breakStart: null,
          breakEnd: null,
        }),
      });
    });

    it('cria sempre com active:true independente do payload', async () => {
      prismaMock.schedule.create.mockResolvedValue(SCHEDULE_STUB);

      await service.create(makeCreateScheduleDto());

      expect(prismaMock.schedule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ active: true }),
      });
    });

    it('executa todos os creates em paralelo com Promise.all', async () => {
      prismaMock.schedule.create
        .mockResolvedValueOnce(SCHEDULE_STUB)
        .mockResolvedValueOnce({ ...SCHEDULE_STUB, id: 'uuid-schedule-2' });

      const dto = makeCreateScheduleDto({
        schedules: [makeScheduleItemDto({ dayOfWeek: 1 }), makeScheduleItemDto({ dayOfWeek: 2 })],
      });

      const result = await service.create(dto);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    const setupHappyPath = () => {
      prismaMock.schedule.findUnique.mockResolvedValue(SCHEDULE_STUB);
      prismaMock.schedule.update.mockResolvedValue(SCHEDULE_STUB);
    };

    it('verifica se o schedule existe antes de atualizar', async () => {
      setupHappyPath();

      await service.update('uuid-schedule-1', makeScheduleItemDto());

      expect(prismaMock.schedule.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-schedule-1' },
      });
    });

    it('atualiza com os dados do item quando fornecidos', async () => {
      setupHappyPath();
      const item = makeScheduleItemDto({ startTime: '09:00', endTime: '17:00' });

      await service.update('uuid-schedule-1', item);

      expect(prismaMock.schedule.update).toHaveBeenCalledWith({
        where: { id: 'uuid-schedule-1' },
        data: expect.objectContaining({
          startTime: '09:00',
          endTime: '17:00',
        }),
      });
    });

    it('usa dayOfWeek do banco quando não é informado no item', async () => {
      prismaMock.schedule.findUnique.mockResolvedValue({
        ...SCHEDULE_STUB,
        dayOfWeek: 3,
      });
      prismaMock.schedule.update.mockResolvedValue(SCHEDULE_STUB);

      await service.update('uuid-schedule-1', makeScheduleItemDto({ dayOfWeek: undefined }));

      expect(prismaMock.schedule.update).toHaveBeenCalledWith({
        where: { id: 'uuid-schedule-1' },
        data: expect.objectContaining({ dayOfWeek: 3 }),
      });
    });

    it('converte date string para Date quando informado', async () => {
      setupHappyPath();

      await service.update(
        'uuid-schedule-1',
        makeScheduleItemDto({ date: '2026-03-15' }),
      );

      expect(prismaMock.schedule.update).toHaveBeenCalledWith({
        where: { id: 'uuid-schedule-1' },
        data: expect.objectContaining({
          date: new Date('2026-03-15'),
        }),
      });
    });

    it('usa date do banco quando não é informado no item', async () => {
      const dataExistente = new Date('2026-02-19');
      prismaMock.schedule.findUnique.mockResolvedValue({
        ...SCHEDULE_STUB,
        date: dataExistente,
      });
      prismaMock.schedule.update.mockResolvedValue(SCHEDULE_STUB);

      await service.update('uuid-schedule-1', makeScheduleItemDto({ date: undefined }));

      expect(prismaMock.schedule.update).toHaveBeenCalledWith({
        where: { id: 'uuid-schedule-1' },
        data: expect.objectContaining({ date: dataExistente }),
      });
    });

    it('usa breakStart do banco quando não é informado no item', async () => {
      prismaMock.schedule.findUnique.mockResolvedValue({
        ...SCHEDULE_STUB,
        breakStart: '11:00',
      });
      prismaMock.schedule.update.mockResolvedValue(SCHEDULE_STUB);

      await service.update(
        'uuid-schedule-1',
        makeScheduleItemDto({ breakStart: undefined }),
      );

      expect(prismaMock.schedule.update).toHaveBeenCalledWith({
        where: { id: 'uuid-schedule-1' },
        data: expect.objectContaining({ breakStart: '11:00' }),
      });
    });

    it('lança BadRequestException quando o schedule não existe', async () => {
      prismaMock.schedule.findUnique.mockResolvedValue(null);

      await expect(
        service.update('id-inexistente', makeScheduleItemDto()),
      ).rejects.toThrow(BadRequestException);
    });

    it('não chama update quando o schedule não existe', async () => {
      prismaMock.schedule.findUnique.mockResolvedValue(null);

      await service.update('id-inexistente', makeScheduleItemDto()).catch(() => {});

      expect(prismaMock.schedule.update).not.toHaveBeenCalled();
    });
  });

  describe('desactivate', () => {
    it('desativa o schedule definindo active como false', async () => {
      prismaMock.schedule.update.mockResolvedValue({ ...SCHEDULE_STUB, active: false });

      await service.desactivate('uuid-schedule-1');

      expect(prismaMock.schedule.update).toHaveBeenCalledWith({
        where: { id: 'uuid-schedule-1' },
        data: { active: false },
      });
    });

    it('retorna o schedule desativado', async () => {
      const scheduleDesativado = { ...SCHEDULE_STUB, active: false };
      prismaMock.schedule.update.mockResolvedValue(scheduleDesativado);

      const result = await service.desactivate('uuid-schedule-1');

      expect(result).toEqual(scheduleDesativado);
    });
  });
});