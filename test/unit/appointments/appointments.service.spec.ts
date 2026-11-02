import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';

import { AppointmentsService } from '../../../src/modules/appointments/appointments.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { AppointmentProducer } from '../../../src/queues/producers/appointment.producer';
import { AppointmentMapper } from '../../../src/modules/appointments/mapper/appointment.mapper';
import { AppointmentEvents } from '../../../src/modules/appointments/events/appointment.events';

import { makePrismaMock } from '../../mocks/services/prisma.mock';
import { makeCreateAppointmentDto } from '../../mocks/factories/appointment.factory';
import { CLIENT_STUB, CLIENT_SEM_EMAIL_STUB } from '../../mocks/stubs/client.stub';
import { PROFESSIONAL_STUB, PROFESSIONAL_INATIVO_STUB } from '../../mocks/stubs/professional.stub';
import { SERVICE_STUB, PROFESSIONAL_SERVICE_STUB } from '../../mocks/stubs/service.stub';
import {
  SLOT_STUB,
  APPOINTMENT_STUB,
  APPOINTMENT_RESPONSE_STUB,
  APPOINTMENT_CANCELAVEL_STUB,
} from '../../mocks/stubs/appointment.stub';

jest.mock('../../../src/modules/appointments/mapper/appointment.mapper');
jest.mock('../../../src/modules/appointments/events/appointment.events');

const AppointmentMapperMock = AppointmentMapper as jest.Mocked<typeof AppointmentMapper>;
const AppointmentEventsMock = AppointmentEvents as jest.Mocked<typeof AppointmentEvents>;
const FITTING_SCHEDULE = {
  startTime: '00:00',
  endTime: '23:59',
  breakStart: null,
  breakEnd: null,
};

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prismaMock: ReturnType<typeof makePrismaMock>;
  let producerMock: jest.Mocked<
    Pick<
      AppointmentProducer,
      | 'publishCancelled'
      | 'publishCompleted'
      | 'publishConfirmed'
      | 'publishCreated'
      | 'publishRescheduled'
    >
  >;

  beforeEach(async () => {
    prismaMock = makePrismaMock();

    producerMock = {
      publishCreated: jest.fn().mockResolvedValue(undefined),
      publishCancelled: jest.fn().mockResolvedValue(undefined),
      publishConfirmed: jest.fn().mockResolvedValue(undefined),
      publishCompleted: jest.fn().mockResolvedValue(undefined),
      publishRescheduled: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AppointmentProducer, useValue: producerMock },
      ],
    }).compile();

    service = module.get(AppointmentsService);
    jest.clearAllMocks();
    prismaMock.$transaction.mockImplementation((fn: any) => fn(prismaMock));
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('retorna todos os agendamentos sem filtro de status', async () => {
      prismaMock.appointment.findMany.mockResolvedValue([APPOINTMENT_STUB]);
      AppointmentMapperMock.toResponseList.mockReturnValue([APPOINTMENT_RESPONSE_STUB]);

      const result = await service.findAll();

      expect(prismaMock.appointment.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { scheduledAt: 'desc' },
        include: expect.any(Object),
      });
      expect(result).toEqual([APPOINTMENT_RESPONSE_STUB]);
    });

    it('filtra por status quando fornecido', async () => {
      prismaMock.appointment.findMany.mockResolvedValue([APPOINTMENT_STUB]);
      AppointmentMapperMock.toResponseList.mockReturnValue([APPOINTMENT_RESPONSE_STUB]);

      await service.findAll('PENDING');

      expect(prismaMock.appointment.findMany).toHaveBeenCalledWith({
        where: { status: 'PENDING' },
        orderBy: { scheduledAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('retorna lista vazia quando não há agendamentos', async () => {
      prismaMock.appointment.findMany.mockResolvedValue([]);
      AppointmentMapperMock.toResponseList.mockReturnValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('retorna o agendamento mapeado quando existe', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(APPOINTMENT_STUB);
      AppointmentMapperMock.toResponse.mockReturnValue(APPOINTMENT_RESPONSE_STUB);

      const result = await service.findById('uuid-appointment-1');

      expect(result).toEqual(APPOINTMENT_RESPONSE_STUB);
    });

    it('lança NotFoundException quando o agendamento não existe', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(null);

      await expect(service.findById('id-inexistente')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const setupHappyPath = () => {
      prismaMock.client.findUnique.mockResolvedValue(CLIENT_STUB);
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);
      prismaMock.professionalService.findUnique.mockResolvedValue(PROFESSIONAL_SERVICE_STUB);
      prismaMock.timeSlot.findFirst.mockResolvedValue(SLOT_STUB);
      prismaMock.appointment.create.mockResolvedValue(APPOINTMENT_STUB);
      prismaMock.timeSlot.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.schedule.findMany.mockResolvedValue([FITTING_SCHEDULE]);
      prismaMock.appointment.findUnique.mockResolvedValue(APPOINTMENT_STUB);
      AppointmentMapperMock.toResponse.mockReturnValue(APPOINTMENT_RESPONSE_STUB);
      AppointmentEventsMock.createdPayload.mockReturnValue({} as any);
    };

    it('cria o agendamento com os dados corretos', async () => {
      setupHappyPath();
      const dto = makeCreateAppointmentDto();

      await service.create(dto, 'uuid-user-criador');

      expect(prismaMock.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          clientId: dto.clientId,
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
          scheduledAt: SLOT_STUB.startsAt,
          status: AppointmentStatus.PENDING,
          createdById: 'uuid-user-criador',
        }),
      });
    });

    it('usa o preço customizado do profissional quando disponível', async () => {
      setupHappyPath();
      prismaMock.professionalService.findUnique.mockResolvedValue({
        ...PROFESSIONAL_SERVICE_STUB,
        customPrice: 60.0,
      });

      await service.create(makeCreateAppointmentDto());

      expect(prismaMock.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ price: 60.0 }),
      });
    });

    it('usa o preço do serviço quando não há preço customizado', async () => {
      setupHappyPath();

      await service.create(makeCreateAppointmentDto());

      expect(prismaMock.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ price: SERVICE_STUB.price }),
      });
    });

    it('usa a duração customizada do profissional quando disponível', async () => {
      setupHappyPath();
      prismaMock.professionalService.findUnique.mockResolvedValue({
        ...PROFESSIONAL_SERVICE_STUB,
        customDuration: 45,
      });

      await service.create(makeCreateAppointmentDto());

      expect(prismaMock.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ duration: 45 }),
      });
    });

    it('marca o slot como indisponível após criar o agendamento', async () => {
      setupHappyPath();

      await service.create(makeCreateAppointmentDto());

      expect(prismaMock.timeSlot.updateMany).toHaveBeenCalledWith({
        where: {
          id: SLOT_STUB.id,
          professionalId: SLOT_STUB.professionalId,
          available: true,
          appointmentId: null,
        },
        data: { available: false, appointmentId: APPOINTMENT_STUB.id },
      });
    });

    it('publica evento no RabbitMQ após criar o agendamento', async () => {
      setupHappyPath();

      await service.create(makeCreateAppointmentDto());

      expect(producerMock.publishCreated).toHaveBeenCalledTimes(1);
    });

    it('retorna o agendamento mapeado com todas as relações', async () => {
      setupHappyPath();

      const result = await service.create(makeCreateAppointmentDto());

      expect(result).toEqual(APPOINTMENT_RESPONSE_STUB);
    });

    it('lança BadRequestException quando o cliente não existe', async () => {
      prismaMock.client.findUnique.mockResolvedValue(null);

      await expect(service.create(makeCreateAppointmentDto())).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException quando o cliente não tem email', async () => {
      prismaMock.client.findUnique.mockResolvedValue(CLIENT_SEM_EMAIL_STUB);

      await expect(service.create(makeCreateAppointmentDto())).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException quando o profissional não existe', async () => {
      prismaMock.client.findUnique.mockResolvedValue(CLIENT_STUB);
      prismaMock.professional.findUnique.mockResolvedValue(null);

      await expect(service.create(makeCreateAppointmentDto())).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException quando o profissional está inativo', async () => {
      prismaMock.client.findUnique.mockResolvedValue(CLIENT_STUB);
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_INATIVO_STUB);

      await expect(service.create(makeCreateAppointmentDto())).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException quando o profissional não executa o serviço', async () => {
      prismaMock.client.findUnique.mockResolvedValue(CLIENT_STUB);
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);
      prismaMock.professionalService.findUnique.mockResolvedValue(null);

      await expect(service.create(makeCreateAppointmentDto())).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException quando o vínculo profissional-serviço está inativo', async () => {
      prismaMock.client.findUnique.mockResolvedValue(CLIENT_STUB);
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);
      prismaMock.professionalService.findUnique.mockResolvedValue({
        ...PROFESSIONAL_SERVICE_STUB,
        active: false,
      });

      await expect(service.create(makeCreateAppointmentDto())).rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException quando o serviço está inativo', async () => {
      prismaMock.client.findUnique.mockResolvedValue(CLIENT_STUB);
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);
      prismaMock.professionalService.findUnique.mockResolvedValue({
        ...PROFESSIONAL_SERVICE_STUB,
        service: { ...SERVICE_STUB, active: false },
      });

      await expect(service.create(makeCreateAppointmentDto())).rejects.toThrow(BadRequestException);
    });

    it('lança ConflictException quando o slot está indisponível', async () => {
      prismaMock.client.findUnique.mockResolvedValue(CLIENT_STUB);
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);
      prismaMock.professionalService.findUnique.mockResolvedValue(PROFESSIONAL_SERVICE_STUB);
      prismaMock.timeSlot.findFirst.mockResolvedValue(null);

      await expect(service.create(makeCreateAppointmentDto())).rejects.toThrow(ConflictException);
    });

    it('busca slot vinculado ao profissional correto e disponível', async () => {
      setupHappyPath();
      const dto = makeCreateAppointmentDto();

      await service.create(dto);

      expect(prismaMock.timeSlot.findFirst).toHaveBeenCalledWith({
        where: {
          id: dto.slotId,
          professionalId: dto.professionalId,
          available: true,
        },
      });
    });
  });

  describe('cancel', () => {
    const setupHappyPath = () => {
      prismaMock.appointment.findUnique.mockResolvedValue(APPOINTMENT_CANCELAVEL_STUB);
      prismaMock.appointment.update.mockResolvedValue({
        ...APPOINTMENT_CANCELAVEL_STUB,
        status: AppointmentStatus.CANCELLED,
        cancelReason: 'Cliente desistiu',
      });
      prismaMock.timeSlot.updateMany.mockResolvedValue({ count: 1 });
      AppointmentMapperMock.toResponse.mockReturnValue({
        ...APPOINTMENT_RESPONSE_STUB,
        status: AppointmentStatus.CANCELLED,
      });
      AppointmentEventsMock.cancelledPayload.mockReturnValue({} as any);
    };

    it('cancela o agendamento e atualiza o status', async () => {
      setupHappyPath();

      await service.cancel('uuid-appointment-1', 'Cliente desistiu');

      expect(prismaMock.appointment.update).toHaveBeenCalledWith({
        where: { id: 'uuid-appointment-1' },
        data: { status: AppointmentStatus.CANCELLED, cancelReason: 'Cliente desistiu' },
        include: expect.any(Object),
      });
    });

    it('libera o slot de volta ao cancelar', async () => {
      setupHappyPath();

      await service.cancel('uuid-appointment-1');

      expect(prismaMock.timeSlot.updateMany).toHaveBeenCalledWith({
        where: { appointmentId: 'uuid-appointment-1' },
        data: { available: true, appointmentId: null },
      });
    });

    it('publica evento de cancelamento no RabbitMQ', async () => {
      setupHappyPath();

      await service.cancel('uuid-appointment-1', 'Motivo qualquer');

      expect(producerMock.publishCancelled).toHaveBeenCalledTimes(1);
    });

    it('retorna o agendamento cancelado mapeado', async () => {
      setupHappyPath();

      const result = await service.cancel('uuid-appointment-1');

      expect(result).toEqual(
        expect.objectContaining({ status: AppointmentStatus.CANCELLED }),
      );
    });

    it('lança NotFoundException quando o agendamento não existe', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(null);

      await expect(service.cancel('id-inexistente')).rejects.toThrow(NotFoundException);
    });

    it('impede que um cliente cancele o agendamento de outra pessoa', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(
        APPOINTMENT_CANCELAVEL_STUB,
      );

      await expect(
        service.cancel('uuid-appointment-1', undefined, {
          sub: 'outro-cliente',
          accountType: 'CLIENT',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lança BadRequestException quando o agendamento já está cancelado', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue({
        ...APPOINTMENT_CANCELAVEL_STUB,
        status: AppointmentStatus.CANCELLED,
      });

      await expect(service.cancel('uuid-appointment-1')).rejects.toThrow(BadRequestException);
    });

    it('cancela mesmo sem email do cliente para não prender o slot', async () => {
      setupHappyPath();
      prismaMock.appointment.findUnique.mockResolvedValue({
        ...APPOINTMENT_CANCELAVEL_STUB,
        client: CLIENT_SEM_EMAIL_STUB,
      });

      await expect(service.cancel('uuid-appointment-1')).resolves.toBeDefined();
    });

    it('cancela mesmo sem contato do profissional para não prender o slot', async () => {
      setupHappyPath();
      prismaMock.appointment.findUnique.mockResolvedValue({
        ...APPOINTMENT_CANCELAVEL_STUB,
        professional: {
          ...PROFESSIONAL_STUB,
          user: { ...PROFESSIONAL_STUB.user, email: null },
        },
      });

      await expect(service.cancel('uuid-appointment-1')).resolves.toBeDefined();
    });
  });

  describe('updateStatus', () => {
    const setupHappyPath = () => {
      prismaMock.appointment.findUnique.mockResolvedValue(
        APPOINTMENT_CANCELAVEL_STUB,
      );
      prismaMock.appointment.update.mockResolvedValue(
        APPOINTMENT_CANCELAVEL_STUB,
      );
      AppointmentMapperMock.toResponse.mockReturnValue(
        APPOINTMENT_RESPONSE_STUB,
      );
      AppointmentEventsMock.createdPayload.mockReturnValue({} as any);
    };

    it('publica confirmação quando o agendamento é confirmado', async () => {
      setupHappyPath();

      await service.updateStatus(
        APPOINTMENT_STUB.id,
        AppointmentStatus.CONFIRMED,
      );

      expect(producerMock.publishConfirmed).toHaveBeenCalledTimes(1);
    });

    it('publica conclusão quando o atendimento é concluído', async () => {
      setupHappyPath();
      prismaMock.appointment.findUnique.mockResolvedValue({
        ...APPOINTMENT_CANCELAVEL_STUB,
        status: AppointmentStatus.IN_PROGRESS,
      });

      await service.updateStatus(
        APPOINTMENT_STUB.id,
        AppointmentStatus.COMPLETED,
      );

      expect(producerMock.publishCompleted).toHaveBeenCalledTimes(1);
    });

    it('rejeita pular etapas do status do agendamento', async () => {
      setupHappyPath();

      await expect(
        service.updateStatus(APPOINTMENT_STUB.id, AppointmentStatus.COMPLETED),
      ).rejects.toThrow(BadRequestException);
    });

    it('impede que clientes alterem o status de um agendamento', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(
        APPOINTMENT_CANCELAVEL_STUB,
      );

      await expect(
        service.updateStatus(
          APPOINTMENT_STUB.id,
          AppointmentStatus.COMPLETED,
          { sub: CLIENT_STUB.id, accountType: 'CLIENT' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reschedule', () => {
    const dto = {
      professionalId: PROFESSIONAL_STUB.id,
      serviceId: SERVICE_STUB.id,
      slotId: SLOT_STUB.id,
    };

    const setupHappyPath = () => {
      const rescheduled = {
        ...APPOINTMENT_CANCELAVEL_STUB,
        scheduledAt: SLOT_STUB.startsAt,
      };
      prismaMock.appointment.findUnique.mockResolvedValue(
        APPOINTMENT_CANCELAVEL_STUB,
      );
      prismaMock.professional.findUnique.mockResolvedValue(PROFESSIONAL_STUB);
      prismaMock.professionalService.findUnique.mockResolvedValue(
        PROFESSIONAL_SERVICE_STUB,
      );
      prismaMock.timeSlot.findFirst.mockResolvedValue(SLOT_STUB);
      prismaMock.timeSlot.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.schedule.findMany.mockResolvedValue([FITTING_SCHEDULE]);
      prismaMock.appointment.update.mockResolvedValue(rescheduled);
      AppointmentMapperMock.toResponse.mockReturnValue(
        APPOINTMENT_RESPONSE_STUB,
      );
      AppointmentEventsMock.createdPayload.mockReturnValue({} as any);
    };

    it('atualiza o horário e troca os slots em uma transação', async () => {
      setupHappyPath();

      await service.reschedule(
        APPOINTMENT_STUB.id,
        dto,
        CLIENT_STUB.id,
      );

      expect(prismaMock.timeSlot.updateMany).toHaveBeenNthCalledWith(1, {
        where: { appointmentId: APPOINTMENT_STUB.id, id: { not: SLOT_STUB.id } },
        data: { available: true, appointmentId: null },
      });
      expect(prismaMock.timeSlot.updateMany).toHaveBeenNthCalledWith(2, {
        where: {
          id: SLOT_STUB.id,
          professionalId: dto.professionalId,
          available: true,
          appointmentId: null,
        },
        data: { available: false, appointmentId: APPOINTMENT_STUB.id },
      });
      expect(prismaMock.appointment.update).toHaveBeenCalledWith({
        where: { id: APPOINTMENT_STUB.id },
        data: expect.objectContaining({
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
          scheduledAt: SLOT_STUB.startsAt,
          status: AppointmentStatus.PENDING,
        }),
        include: expect.any(Object),
      });
      expect(producerMock.publishRescheduled).toHaveBeenCalledTimes(1);
    });

    it('falha sem atualizar o agendamento quando outro pedido ganha o slot', async () => {
      setupHappyPath();
      prismaMock.timeSlot.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      await expect(
        service.reschedule(APPOINTMENT_STUB.id, dto, CLIENT_STUB.id),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.timeSlot.updateMany).toHaveBeenNthCalledWith(1, {
        where: { appointmentId: APPOINTMENT_STUB.id, id: { not: SLOT_STUB.id } },
        data: { available: true, appointmentId: null },
      });
      expect(prismaMock.appointment.update).not.toHaveBeenCalled();
    });

    it('impede que um cliente remarque o agendamento de outra pessoa', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(
        APPOINTMENT_CANCELAVEL_STUB,
      );

      await expect(
        service.reschedule(APPOINTMENT_STUB.id, dto, 'outro-cliente'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
