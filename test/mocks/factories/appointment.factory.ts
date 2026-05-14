import { CreateAppointmentDto } from '../../../src/modules/appointments/dto/create-appointments.dto';

export const makeCreateAppointmentDto = (
  overrides?: Partial<CreateAppointmentDto>,
): CreateAppointmentDto => ({
  clientId: 'uuid-client-1',
  professionalId: 'uuid-prof-1',
  serviceId: 'uuid-service-1',
  slotId: 'uuid-slot-1',
  notes: 'Corte degradê',
  ...overrides,
});