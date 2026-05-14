import { CreateProfessionalDto } from '../../../src/modules/professionals/dto/create-profissional.dto';

export const makeCreateProfessionalDto = (
  overrides?: Partial<CreateProfessionalDto>,
): CreateProfessionalDto => ({
  userId: 'uuid-user-123',
  specialty: 'Corte masculino',
  bio: 'Especialista em cortes degradê',
  experience: 5,
  commission: 40,
  ...overrides,
});