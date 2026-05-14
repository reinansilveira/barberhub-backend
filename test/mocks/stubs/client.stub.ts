export const CLIENT_STUB = {
  id: 'uuid-client-1',
  name: 'João Silva',
  phone: '+5579999999999',
  email: 'joao@email.com',
  phoneVerifiedAt: new Date('2024-01-15T10:00:00Z'),
};

export const CLIENT_COMPLETO_STUB = {
  id: 'uuid-client-1',
  name: 'João Silva',
  phone: '+5579999999999',
  email: 'joao@email.com',
  active: true,
  phoneVerifiedAt: new Date('2024-01-15T10:00:00Z'),
  reengagementSentAt: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

export const CLIENT_SEM_EMAIL_STUB = {
  ...CLIENT_STUB,
  email: null,
};

export const CLIENT_RESPONSE_STUB = {
  id: CLIENT_COMPLETO_STUB.id,
  name: CLIENT_COMPLETO_STUB.name,
  phone: CLIENT_COMPLETO_STUB.phone,
  email: CLIENT_COMPLETO_STUB.email,
  createdAt: CLIENT_COMPLETO_STUB.createdAt,
};

export const VERIFY_CODE_RESPONSE_STUB = {
  id: CLIENT_STUB.id,
  name: CLIENT_STUB.name,
  phone: CLIENT_STUB.phone,
  phoneVerifiedAt: CLIENT_STUB.phoneVerifiedAt,
};