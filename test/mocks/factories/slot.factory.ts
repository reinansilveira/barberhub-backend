import { CreateSlotDto } from '../../../src/modules/slots/dto/create-slot.dto';

export const makeCreateSlotDto = (
  overrides?: Partial<CreateSlotDto>,
): CreateSlotDto => ({
  professionalId: 'uuid-prof-1',
  startsAt: '2024-06-01T10:00:00Z',
  ...overrides,
});

export const makeCreateSlotBatchDto = (
  overrides?: Partial<CreateSlotDto>,
): CreateSlotDto => ({
  professionalId: 'uuid-prof-1',
  slots: [
    '2024-06-01T10:00:00Z',
    '2024-06-01T11:00:00Z',
    '2024-06-01T12:00:00Z',
  ],
  ...overrides,
});