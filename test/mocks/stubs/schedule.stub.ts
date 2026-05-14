export const SCHEDULE_STUB = {
  id: 'uuid-schedule-1',
  professionalId: 'uuid-prof-1',
  dayOfWeek: 1,
  date: null,
  startTime: '08:00',
  endTime: '18:00',
  breakStart: '12:00',
  breakEnd: '13:00',
  active: true,
};

export const SCHEDULE_INATIVO_STUB = {
  ...SCHEDULE_STUB,
  active: false,
};

export const SCHEDULE_POR_DATA_STUB = {
  ...SCHEDULE_STUB,
  dayOfWeek: null,
  date: new Date('2026-02-19'),
};