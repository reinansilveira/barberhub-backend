import {
  Appointment,
  Client,
  Professional,
  Service,
  User,
} from '@prisma/client';

type AppointmentWithRelations = Appointment & {
  client: Client & { user: User };
  professional: Professional & { user: User };
  service: Service;
  customPrice?: any;
};

export class AppointmentEvents {
  static createdPayload(
    appointment: Appointment & { price: any },
    client: Client & { user: User },
    professional: Professional & { user: User },
    serviceName: string,
    initialPassword?: string,
  ) {
    return {
      appointmentId: appointment.id,

      clientId: client.id,
      clientUserId: client.userId,
      clientName: client.user.name,
      clientPhone: client.user.phone ?? '',
      clientEmail: client.user.email ?? '',

      professionalId: professional.id,
      professionalUserId: professional.userId,
      professionalName: professional.user.name,
      professionalPhone: professional.user.phone!,
      professionalEmail: professional.user.email!,
      serviceName,
      scheduledAt: appointment.scheduledAt,
      duration: appointment.duration,
      price: Number(appointment.price),
      initialPassword,
    };
  }

  static cancelledPayload(
    appointment: AppointmentWithRelations,
    cancelReason: string,
  ) {
    return {
      appointmentId: appointment.id,
      cancelReason,

      clientId: appointment.client.id,
      clientUserId: appointment.client.userId,
      clientName: appointment.client.user.name,
      clientPhone: appointment.client.user.phone ?? '',
      clientEmail: appointment.client.user.email ?? '',

      professionalId: appointment.professional.id,
      professionalUserId: appointment.professional.userId,
      professionalName: appointment.professional.user.name,
      professionalPhone: appointment.professional.user.phone!,
      professionalEmail: appointment.professional.user.email!,

      serviceName: appointment.service.name,
      scheduledAt: appointment.scheduledAt,
    };
  }
}
