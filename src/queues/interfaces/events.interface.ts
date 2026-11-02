export interface AppointmentNotificationEvent {
  appointmentId: string;
  clientId: string;
  clientUserId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  professionalId: string;
  professionalUserId: string;
  professionalName: string;
  professionalPhone: string;
  professionalEmail: string;
  serviceName: string;
  scheduledAt: Date;
}

export interface AppointmentCreatedEvent extends AppointmentNotificationEvent {
  duration: number;
  price: number;
  initialPassword?: string;
}

export interface AppointmentCancelledEvent
  extends AppointmentNotificationEvent {
  cancelReason: string;
}

export interface ClientReengagementEvent {
  clientId: string;
  clientUserId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
}

export interface AppointmentReminderEvent {
  appointmentId: string;
  clientId: string;
  clientUserId: string;
  clientPhone: string;
  clientEmail?: string;
  serviceName: string;
  professionalName: string;
  scheduledAt: Date;
}

export interface PaymentReceivedEvent {
  paymentId: string;
  appointmentId: string;
  amount: number;
  method: string;
  transactionId?: string;
}

export interface ReviewCreatedEvent {
  reviewId: string;
  professionalId: string;
  rating: number;
  clientName: string;
}
