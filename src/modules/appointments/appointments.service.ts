import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AppointmentStatus, UserRole } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AppointmentProducer } from '../../queues/producers/appointment.producer';
import { AppointmentEvents } from './events/appointment.events';
import { AppointmentMapper } from './mapper/appointment.mapper';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { CreateAppointmentDto } from './dto/create-appointments.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CreateOwnAppointmentDto } from './dto/create-own-appointment.dto';
import {
  AuthPrincipal,
  hasRole,
  isBackOfficePrincipal,
} from '../auth/types/auth-principal.type';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly producer: AppointmentProducer,
  ) {}

  public async findAll(status?: string): Promise<AppointmentResponseDto[]> {
    const appointments = await this.prisma.appointment.findMany({
      where: status ? { status: status as AppointmentStatus } : undefined,
      orderBy: { scheduledAt: 'desc' },
      include: this.includeRelations(),
    });

    return AppointmentMapper.toResponseList(appointments);
  }

  public async findById(
    id: string,
    actor?: AuthPrincipal,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.findRawOrThrow(id);
    this.assertCanAccess(appointment, actor);
    return AppointmentMapper.toResponse(appointment);
  }

  public async createForActor(
    dto: CreateAppointmentDto,
    actor: AuthPrincipal,
  ) {
    if (!isBackOfficePrincipal(actor)) {
      throw new ForbiddenException(
        'Use a rota de agendamento do cliente autenticado.',
      );
    }

    if (
      hasRole(actor, UserRole.PROFESSIONAL) &&
      !hasRole(actor, UserRole.ADMIN)
    ) {
      const professional = await this.prisma.professional.findUnique({
        where: { id: dto.professionalId },
        select: { userId: true },
      });

      if (!professional || professional.userId !== actor.sub) {
        throw new ForbiddenException(
          'Você não pode criar agendamento para outro profissional.',
        );
      }
    } else if (!hasRole(actor, UserRole.ADMIN)) {
      throw new ForbiddenException('Sem permissão para criar agendamentos.');
    }

    return this.create(dto, actor.sub);
  }

  public async createForClient(
    dto: CreateOwnAppointmentDto,
    clientId: string,
  ) {
    return this.create({ ...dto, clientId });
  }

  public async create(
    dto: CreateAppointmentDto,
    createdById?: string,
    initialPassword?: string,
  ): Promise<AppointmentResponseDto> {
    const client = await this.prisma.client.findUnique({
      where: { id: dto.clientId },
      include: { user: true },
    });

    if (!client) throw new BadRequestException('Cliente não encontrado');

    const professional = await this.prisma.professional.findUnique({
      where: { id: dto.professionalId },
      include: { user: true },
    });

    if (!professional?.active)
      throw new BadRequestException('Profissional inválido ou inativo');

    const professionalService =
      await this.prisma.professionalService.findUnique({
        where: {
          professionalId_serviceId: {
            professionalId: dto.professionalId,
            serviceId: dto.serviceId,
          },
        },
        include: { service: true },
      });

    if (!professionalService?.active)
      throw new BadRequestException('Profissional não executa este serviço');

    if (!professionalService.service.active)
      throw new BadRequestException('Serviço inativo');

    const slot = await this.prisma.timeSlot.findFirst({
      where: {
        id: dto.slotId,
        professionalId: dto.professionalId,
        available: true,
      },
    });

    if (!slot) throw new ConflictException('Horário indisponível');

    const price =
      professionalService.customPrice ?? professionalService.service.price;
    const duration =
      professionalService.customDuration ??
      professionalService.service.duration;

    const endsAt = new Date(slot.startsAt.getTime() + duration * 60_000);
    await this.assertFitsSchedule(dto.professionalId, slot.startsAt, endsAt);
    const appointmentId = randomUUID();
    let appointment;

    try {
      appointment = await this.prisma.$transaction(async (tx) => {
        const created = await tx.appointment.create({
          data: {
            id: appointmentId,
            clientId: dto.clientId,
            professionalId: dto.professionalId,
            serviceId: dto.serviceId,
            scheduledAt: slot.startsAt,
            endsAt,
            duration,
            price,
            notes: dto.notes,
            createdById,
            status: AppointmentStatus.PENDING,
          },
        });

        const claimed = await tx.timeSlot.updateMany({
          where: {
            id: slot.id,
            professionalId: dto.professionalId,
            available: true,
            appointmentId: null,
          },
          data: { available: false, appointmentId: created.id },
        });

        if (claimed.count !== 1) {
          throw new ConflictException('Horário indisponível');
        }

        return created;
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (
        error instanceof PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2004')
      ) {
        throw new ConflictException('Horário indisponível');
      }
      throw error;
    }

    await this.producer.publishCreated(
      AppointmentEvents.createdPayload(
        appointment,
        client,
        professional,
        professionalService.service.name,
        initialPassword,
      ),
    );

    return AppointmentMapper.toResponse(
      await this.findRawOrThrow(appointment.id),
    );
  }

  public async cancel(
    id: string,
    reason?: string,
    actor?: AuthPrincipal,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.findRawOrThrow(id);
    this.assertCanAccess(appointment, actor);

    if (appointment.status === AppointmentStatus.CANCELLED)
      throw new BadRequestException('Agendamento já está cancelado');

    const cancelled = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.CANCELLED, cancelReason: reason },
        include: this.includeRelations(),
      });

      await tx.timeSlot.updateMany({
        where: { appointmentId: id },
        data: { available: true, appointmentId: null },
      });

      return updated;
    });

    await this.producer.publishCancelled(
      AppointmentEvents.cancelledPayload(cancelled, reason ?? 'Não informado'),
    );

    return AppointmentMapper.toResponse(cancelled);
  }

  public async updateStatus(
    id: string,
    status: AppointmentStatus,
    actor?: AuthPrincipal,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.findRawOrThrow(id);

    if (actor?.accountType === 'CLIENT') {
      throw new ForbiddenException(
        'Clientes não podem alterar o status de agendamentos',
      );
    }

    this.assertCanAccess(appointment, actor);

    if (status === AppointmentStatus.CANCELLED) {
      return this.cancel(id, undefined, actor);
    }

    const allowedTransitions: Record<
      AppointmentStatus,
      AppointmentStatus[]
    > = {
      [AppointmentStatus.PENDING]: [AppointmentStatus.CONFIRMED],
      [AppointmentStatus.CONFIRMED]: [
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.NO_SHOW,
      ],
      [AppointmentStatus.IN_PROGRESS]: [AppointmentStatus.COMPLETED],
      [AppointmentStatus.COMPLETED]: [],
      [AppointmentStatus.CANCELLED]: [],
      [AppointmentStatus.NO_SHOW]: [],
    };

    if (!allowedTransitions[appointment.status].includes(status)) {
      throw new BadRequestException('Transição de status inválida');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      return tx.appointment.update({
        where: { id },
        data: {
          status,
          startedAt:
            status === AppointmentStatus.IN_PROGRESS
              ? appointment.startedAt ?? new Date()
              : appointment.startedAt,
          completedAt:
            status === AppointmentStatus.COMPLETED
              ? appointment.completedAt ?? new Date()
              : appointment.completedAt,
        },
        include: this.includeRelations(),
      });
    });

    const event = AppointmentEvents.createdPayload(
      updated,
      updated.client,
      updated.professional,
      updated.service.name,
    );

    if (status === AppointmentStatus.CONFIRMED) {
      await this.producer.publishConfirmed(event);
    }

    if (status === AppointmentStatus.COMPLETED) {
      await this.producer.publishCompleted(event);
    }

    return AppointmentMapper.toResponse(updated);
  }

  public async reschedule(
    id: string,
    dto: RescheduleAppointmentDto,
    clientId: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.findRawOrThrow(id);

    if (appointment.clientId !== clientId) {
      throw new ForbiddenException(
        'Você não pode remarcar o agendamento de outro cliente',
      );
    }

    if (
      appointment.status !== AppointmentStatus.PENDING &&
      appointment.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Este agendamento não pode mais ser remarcado',
      );
    }

    const professional = await this.prisma.professional.findUnique({
      where: { id: dto.professionalId },
    });

    if (!professional?.active) {
      throw new BadRequestException('Profissional inválido ou inativo');
    }

    const professionalService =
      await this.prisma.professionalService.findUnique({
        where: {
          professionalId_serviceId: {
            professionalId: dto.professionalId,
            serviceId: dto.serviceId,
          },
        },
        include: { service: true },
      });

    if (!professionalService?.active || !professionalService.service.active) {
      throw new BadRequestException(
        'Profissional não executa este serviço',
      );
    }

    const slot = await this.prisma.timeSlot.findFirst({
      where: {
        id: dto.slotId,
        professionalId: dto.professionalId,
        available: true,
      },
    });

    if (!slot) throw new ConflictException('Horário indisponível');

    const price =
      professionalService.customPrice ?? professionalService.service.price;
    const duration =
      professionalService.customDuration ??
      professionalService.service.duration;

    const endsAt = new Date(slot.startsAt.getTime() + duration * 60_000);
    await this.assertFitsSchedule(dto.professionalId, slot.startsAt, endsAt);
    let rescheduled;

    try {
      rescheduled = await this.prisma.$transaction(async (tx) => {
        // `appointmentId` is unique in TimeSlot. Release the current slot
        // before claiming the new one so the swap does not violate that
        // constraint midway through the transaction.
        await tx.timeSlot.updateMany({
          where: { appointmentId: id, id: { not: slot.id } },
          data: { available: true, appointmentId: null },
        });

        const claimed = await tx.timeSlot.updateMany({
          where: {
            id: slot.id,
            professionalId: dto.professionalId,
            available: true,
            appointmentId: null,
          },
          data: { available: false, appointmentId: id },
        });

        if (claimed.count !== 1) {
          throw new ConflictException('Horário indisponível');
        }

        const updated = await tx.appointment.update({
          where: { id },
          data: {
            professionalId: dto.professionalId,
            serviceId: dto.serviceId,
            scheduledAt: slot.startsAt,
            endsAt,
            duration,
            price,
            status: AppointmentStatus.PENDING,
          },
          include: this.includeRelations(),
        });

        return updated;
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (
        error instanceof PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2004')
      ) {
        throw new ConflictException('Horário indisponível');
      }
      throw error;
    }

    await this.producer.publishRescheduled(
      AppointmentEvents.createdPayload(
        rescheduled,
        rescheduled.client,
        rescheduled.professional,
        rescheduled.service.name,
      ),
    );

    return AppointmentMapper.toResponse(rescheduled);
  }

  private includeRelations() {
    return {
      client: { include: { user: true } },
      professional: { include: { user: true } },
      service: true,
    } as const;
  }

  private assertCanAccess(
    appointment: Awaited<ReturnType<AppointmentsService['findRawOrThrow']>>,
    actor?: AuthPrincipal,
  ) {
    if (!actor) return;

    if (actor.accountType === 'CLIENT') {
      if (appointment.clientId === actor.sub) return;
      throw new ForbiddenException(
        'Você não pode acessar o agendamento de outro cliente',
      );
    }

    if (!isBackOfficePrincipal(actor)) {
      throw new ForbiddenException('Sem permissão para este agendamento');
    }

    if (hasRole(actor, UserRole.ADMIN)) return;

    if (
      hasRole(actor, UserRole.PROFESSIONAL) &&
      appointment.professional.userId === actor.sub
    ) {
      return;
    }

    throw new ForbiddenException('Sem permissão para este agendamento');
  }

  private async assertFitsSchedule(
    professionalId: string,
    startsAt: Date,
    endsAt: Date,
  ) {
    const start = this.businessTime(startsAt);
    const end = this.businessTime(endsAt);

    if (start.date !== end.date) {
      throw new BadRequestException('O atendimento ultrapassa o expediente');
    }

    const schedules = await this.prisma.schedule.findMany({
      where: {
        professionalId,
        active: true,
        OR: [
          { dayOfWeek: start.dayOfWeek, date: null },
          { date: { gte: start.dayStart, lt: start.dayEnd } },
        ],
      },
      select: {
        startTime: true,
        endTime: true,
        breakStart: true,
        breakEnd: true,
      },
    });

    const fits = schedules.some((schedule) => {
      const withinHours =
        start.time >= schedule.startTime && end.time <= schedule.endTime;
      const overlapsBreak =
        schedule.breakStart &&
        schedule.breakEnd &&
        start.time < schedule.breakEnd && end.time > schedule.breakStart;
      return withinHours && !overlapsBreak;
    });

    if (!fits) {
      throw new BadRequestException(
        'O horário escolhido não comporta a duração do serviço.',
      );
    }
  }

  private businessTime(value: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(value);
    const get = (type: string) =>
      parts.find((part) => part.type === type)?.value ?? '';
    const date = `${get('year')}-${get('month')}-${get('day')}`;

    return {
      date,
      dayOfWeek: new Date(`${date}T12:00:00.000Z`).getUTCDay(),
      time: `${get('hour')}:${get('minute')}`,
      dayStart: new Date(`${date}T00:00:00.000Z`),
      dayEnd: new Date(
        new Date(`${date}T00:00:00.000Z`).getTime() + 86_400_000,
      ),
    };
  }

  private async findRawOrThrow(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: this.includeRelations(),
    });

    if (!appointment) throw new NotFoundException('Agendamento não encontrado');

    return appointment;
  }
}
