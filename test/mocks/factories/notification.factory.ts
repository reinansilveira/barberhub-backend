import { NotificationStatus, NotificationType } from '@prisma/client';
import { CreateNotificationDto } from '../../../src/modules/notifications/dto/create-notification.dto';
import { UpdateNotificationStatusDto } from '../../../src/modules/notifications/dto/update-notification-status.dto';

export const makeCreateNotificationDto = (
  overrides?: Partial<CreateNotificationDto>,
): CreateNotificationDto => ({
  recipient: 'cliente@email.com',
  type: NotificationType.WHATSAPP,
  subject: 'Lembrete de agendamento',
  message: 'Sua sessão está agendada para hoje às 14:00.',
  appointmentId: 'uuid-appointment-1',
  metadata: null,
  ...overrides,
});

export const makeUpdateNotificationStatusDto = (
  overrides?: Partial<UpdateNotificationStatusDto>,
): UpdateNotificationStatusDto => ({
  status: NotificationStatus.SENT,
  errorMessage: undefined,
  ...overrides,
});