import {
  Appointment,
  Client,
  Professional,
  Service,
  User,
} from '@prisma/client';
import {
  AppointmentResponseDto,
  AppointmentClientDto,
  AppointmentProfessionalDto,
  AppointmentServiceDto,
} from '../dto/appointment-response.dto';

export type AppointmentWithRelations = Appointment & {
  client: Client & { user: User };
  professional: Professional & { user: User };
  service: Service;
};

export class AppointmentMapper {
  static toResponse(
    appointment: AppointmentWithRelations,
  ): AppointmentResponseDto {
    return {
      id: appointment.id,
      scheduledAt: appointment.scheduledAt,
      duration: appointment.duration,
      price: Number(appointment.price),
      status: appointment.status,
      notes: appointment.notes,
      cancelReason: appointment.cancelReason,
      client: AppointmentMapper.toClientDto(appointment.client),
      professional: AppointmentMapper.toProfessionalDto(
        appointment.professional,
      ),
      service: AppointmentMapper.toServiceDto(appointment.service),
    };
  }

  static toResponseList(
    appointments: AppointmentWithRelations[],
  ): AppointmentResponseDto[] {
    return appointments.map(AppointmentMapper.toResponse);
  }

  private static toClientDto(
    client: Client & { user: User },
  ): AppointmentClientDto {
    return {
      id: client.id,
      name: client.user.name,
      phone: client.user.phone ?? '',
      email: client.user.email ?? '',
    };
  }

  private static toProfessionalDto(
    professional: Professional & { user: User },
  ): AppointmentProfessionalDto {
    return {
      id: professional.id,
      name: professional.user.name,
      email: professional.user.email,
      phone: professional.user.phone,
    };
  }

  private static toServiceDto(service: Service): AppointmentServiceDto {
    return {
      id: service.id,
      name: service.name,
    };
  }
}
