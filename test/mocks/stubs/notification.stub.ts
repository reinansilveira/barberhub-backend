import { NotificationStatus, NotificationType } from '@prisma/client';

export const NOTIFICATION_STUB = {
  id: 'uuid-notification-1',
  recipientUserId: 'uuid-user-client-1',
  recipient: 'cliente@email.com',
  idempotencyKey: null,
  type: NotificationType.WHATSAPP,
  subject: 'Lembrete de agendamento',
  message: 'Sua sessão está agendada para hoje às 14:00.',
  appointmentId: 'uuid-appointment-1',
  metadata: null,
  status: NotificationStatus.PENDING,
  errorMessage: null,
  attempts: 0,
  maxAttempts: 3,
  sentAt: null,
  deliveredAt: null,
  readAt: null,
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
};

export const NOTIFICATION_SEM_APPOINTMENT_STUB = {
  ...NOTIFICATION_STUB,
  appointmentId: null,
};
