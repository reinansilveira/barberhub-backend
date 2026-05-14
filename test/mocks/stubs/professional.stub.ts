import { USER_STUB } from './user.stub';

export const PROFESSIONAL_STUB = {
  id: 'uuid-prof-1',
  userId: 'uuid-user-123',
  specialty: 'Corte masculino',
  bio: 'Especialista em cortes degradê',
  experience: 5,
  commission: 40,
  active: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  user: USER_STUB,
};

export const PROFESSIONAL_INATIVO_STUB = {
  ...PROFESSIONAL_STUB,
  active: false,
};

export const PROFESSIONAL_SEM_USER_STUB = {
  ...PROFESSIONAL_STUB,
  user: null,
};