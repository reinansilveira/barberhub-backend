export const SERVICE_STUB = {
  id: 'uuid-service-1',
  name: 'Corte Masculino',
  price: 45.0,
  duration: 30,
  active: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

export const SERVICE_INATIVO_STUB = {
  ...SERVICE_STUB,
  active: false,
};

export const SERVICE_SEM_DURACAO_STUB = {
  ...SERVICE_STUB,
  duration: 0,
};

export const PROFESSIONAL_SERVICE_STUB = {
  professionalId: 'uuid-prof-1',
  serviceId: 'uuid-service-1',
  active: true,
  customPrice: null,
  customDuration: null,
  service: SERVICE_STUB,
};