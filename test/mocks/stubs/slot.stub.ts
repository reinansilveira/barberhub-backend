export const SLOT_DISPONIVEL_STUB = {
  id: 'uuid-slot-1',
  professionalId: 'uuid-prof-1',
  available: true,
  startsAt: new Date('2024-06-01T10:00:00Z'),
  appointmentId: null,
};

export const SLOT_OCUPADO_STUB = {
  ...SLOT_DISPONIVEL_STUB,
  available: false,
  appointmentId: 'uuid-appointment-1',
};

export const SLOT_RESULT_STUB = {
  id: 'uuid-slot-1',
  startsAt: new Date('2024-06-01T10:00:00Z'),
};

export const SCHEDULE_STUB = {
  id: 'uuid-schedule-1',
  professionalId: 'uuid-prof-1',
  dayOfWeek: new Date('2024-06-01T10:00:00Z').getDay(),
  date: null,
  startTime: '00:00',
  endTime: '23:59',
  breakStart: null,
  breakEnd: null,
  active: true,
};
