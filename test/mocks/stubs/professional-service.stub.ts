import { PROFESSIONAL_STUB } from './professional.stub';
import { SERVICE_STUB } from './service.stub';

export const PROFESSIONAL_SERVICE_STUB = {
  professionalId: 'uuid-prof-1',
  serviceId: 'uuid-service-1',
  active: true,
  customPrice: null,
  customDuration: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  professional: PROFESSIONAL_STUB,
  service: SERVICE_STUB,
};

export const PROFESSIONAL_SERVICE_COM_CUSTOM_STUB = {
  ...PROFESSIONAL_SERVICE_STUB,
  customPrice: 60.0,
  customDuration: 45,
};

export const PROFESSIONAL_SERVICE_INATIVO_STUB = {
  ...PROFESSIONAL_SERVICE_STUB,
  active: false,
};