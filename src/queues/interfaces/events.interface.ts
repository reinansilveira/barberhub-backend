export interface AppointmentCreatedEvent {
  appointmentId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  professionalId: string;
  professionalName: string;
  professionalPhone: string;
  professionalEmail: string;
  serviceName: string;
  scheduledAt: Date;
  duration: number;
  price: number;
  initialPassword?: string;
}

export interface ClientReengagementEvent {
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
}

export interface AppointmentReminderEvent {
  appointmentId: string;
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
