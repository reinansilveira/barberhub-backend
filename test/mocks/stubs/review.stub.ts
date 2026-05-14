import { AppointmentStatus } from '@prisma/client';

export const APPOINTMENT_COMPLETED_STUB = {
  id: 'uuid-appointment-1',
  clientId: 'uuid-client-1',
  professionalId: 'uuid-prof-1',
  status: AppointmentStatus.COMPLETED,
};

export const APPOINTMENT_PENDING_STUB = {
  ...APPOINTMENT_COMPLETED_STUB,
  status: AppointmentStatus.PENDING,
};

export const REVIEW_STUB = {
  id: 'uuid-review-1',
  appointmentId: 'uuid-appointment-1',
  clientId: 'uuid-client-1',
  professionalId: 'uuid-prof-1',
  rating: 5,
  comment: 'Excelente atendimento!',
  response: null,
  respondedAt: null,
  createdAt: new Date('2024-01-15T10:00:00Z'),
};

export const REVIEW_COM_RESPOSTA_STUB = {
  ...REVIEW_STUB,
  response: 'Obrigado pela avaliação!',
  respondedAt: new Date('2024-01-16T10:00:00Z'),
};