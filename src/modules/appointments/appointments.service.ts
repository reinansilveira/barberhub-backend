import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AppointmentProducer } from '../../queues/producers/appointment.producer';
import { AppointmentEvents } from './events/appointment.events';
import { AppointmentMapper } from './mapper/appointment.mapper';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { CreateAppointmentDto } from './dto/create-appointments.dto';

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

  public async findById(id: string): Promise<AppointmentResponseDto> {
    const appointment = await this.findRawOrThrow(id);
    return AppointmentMapper.toResponse(appointment);
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

    if (!client.user.email)
      throw new BadRequestException('Cliente sem email cadastrado');

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

    const appointment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
        data: {
          clientId: dto.clientId,
          professionalId: dto.professionalId,
          serviceId: dto.serviceId,
          scheduledAt: slot.startsAt,
          duration,
          price,
          notes: dto.notes,
          createdById,
          status: AppointmentStatus.PENDING,
        },
      });

      await tx.timeSlot.update({
        where: { id: slot.id },
        data: { available: false, appointmentId: created.id },
      });

      return created;
    });

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
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.findRawOrThrow(id);

    if (appointment.status === AppointmentStatus.CANCELLED)
      throw new BadRequestException('Agendamento já está cancelado');

    if (!appointment.client.user.email)
      throw new BadRequestException('Cliente sem email cadastrado');

    if (
      !appointment.professional.user?.email ||
      !appointment.professional.user?.phone
    )
      throw new BadRequestException('Profissional sem dados de contato');

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

  private includeRelations() {
    return {
      client: { include: { user: true } },
      professional: { include: { user: true } },
      service: true,
    } as const;
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
