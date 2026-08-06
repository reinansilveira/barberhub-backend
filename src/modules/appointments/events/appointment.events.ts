import { Appointment, Client, Professional, Service, User } from '@prisma/client';

type AppointmentWithRelations = Appointment & {
  client: Client;
  professional: Professional & { user: User };
  service: Service;
  customPrice?: any;
};

export class AppointmentEvents {
  static createdPayload(
    appointment: Appointment & { price: any },
    client: Client,
    professional: Professional & { user: User },
    serviceName: string,
    initialPassword?: string,
  ) {
    return {
      appointmentId: appointment.id,

      clientId: client.id,
      clientName: client.name,
      clientPhone: client.phone,
      clientEmail: client.email!,

      professionalId: professional.id,
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

  static cancelledPayload(appointment: AppointmentWithRelations, cancelReason: string) {
    return {
      appointmentId: appointment.id,
      cancelReason,

      clientId: appointment.client.id,
      clientName: appointment.client.name,
      clientPhone: appointment.client.phone,
      clientEmail: appointment.client.email!,

      professionalId: appointment.professional.id,
      professionalName: appointment.professional.user.name,
      professionalPhone: appointment.professional.user.phone!,
      professionalEmail: appointment.professional.user.email!,

      serviceName: appointment.service.name,
      scheduledAt: appointment.scheduledAt,
    };
  }
}
