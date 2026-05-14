import { CreateScheduleDto } from '../../../src/modules/schedule/dto/create-schedule.dto';
import { ScheduleItemDto } from '../../../src/modules/schedule/dto/schedule-item.dto';

export const makeScheduleItemDto = (
  overrides?: Partial<ScheduleItemDto>,
): ScheduleItemDto => ({
  dayOfWeek: 1,
  startTime: '08:00',
  endTime: '18:00',
  breakStart: '12:00',
  breakEnd: '13:00',
  ...overrides,
});

export const makeCreateScheduleDto = (
  overrides?: Partial<CreateScheduleDto>,
): CreateScheduleDto => ({
  professionalId: 'uuid-prof-1',
  schedules: [makeScheduleItemDto()],
  ...overrides,
});