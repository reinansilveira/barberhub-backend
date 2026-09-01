import { AppointmentStatus } from '@prisma/client';
import { CLIENT_STUB } from './client.stub';
import { PROFESSIONAL_STUB } from './professional.stub';
import { SERVICE_STUB } from './service.stub';
import { USER_PROFISSIONAL_STUB } from './user.stub';

export const SLOT_STUB = {
  id: 'uuid-slot-1',
  professionalId: 'uuid-prof-1',
  available: true,
  startsAt: new Date('2024-06-01T10:00:00Z'),
};

export const APPOINTMENT_STUB = {
  id: 'uuid-appointment-1',
  clientId: CLIENT_STUB.id,
  professionalId: PROFESSIONAL_STUB.id,
  serviceId: SERVICE_STUB.id,
  scheduledAt: SLOT_STUB.startsAt,
  duration: 30,
  price: 45.0,
  status: AppointmentStatus.PENDING,
  notes: 'Corte degradê',
  cancelReason: null,
  createdById: null,
  client: CLIENT_STUB,
  professional: PROFESSIONAL_STUB,
  service: SERVICE_STUB,
};

export const APPOINTMENT_RESPONSE_STUB = {
  id: APPOINTMENT_STUB.id,
  scheduledAt: APPOINTMENT_STUB.scheduledAt,
  duration: APPOINTMENT_STUB.duration,
  price: APPOINTMENT_STUB.price,
  status: APPOINTMENT_STUB.status,
  notes: APPOINTMENT_STUB.notes,
  cancelReason: null,
  client: {
    id: CLIENT_STUB.id,
    name: CLIENT_STUB.user.name,
    phone: CLIENT_STUB.user.phone,
    email: CLIENT_STUB.user.email,
  },
  professional: {
    id: PROFESSIONAL_STUB.id,
    name: USER_PROFISSIONAL_STUB.name,
    email: USER_PROFISSIONAL_STUB.email,
    phone: USER_PROFISSIONAL_STUB.phone,
  },
  service: {
    id: SERVICE_STUB.id,
    name: SERVICE_STUB.name,
  },
};

export const APPOINTMENT_CANCELAVEL_STUB = {
  ...APPOINTMENT_STUB,
  status: AppointmentStatus.PENDING,
  professional: {
    ...PROFESSIONAL_STUB,
    user: USER_PROFISSIONAL_STUB,
  },
};
