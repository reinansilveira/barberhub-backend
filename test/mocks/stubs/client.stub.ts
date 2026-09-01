export const CLIENT_STUB = {
  id: 'uuid-client-1',
  userId: 'uuid-client-user-1',
  phoneVerifiedAt: new Date('2024-01-15T10:00:00Z'),
  emailVerifiedAt: null,
  reengagementSentAt: null,
  notes: null,
  active: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  user: {
    id: 'uuid-client-user-1',
    name: 'João Silva',
    phone: '+5579999999999',
    email: 'joao@email.com',
    password: '$2b$10$hashedPasswordAqui',
    avatar: null,
    gender: null,
    active: true,
    mustChangePassword: false,
  },
};

export const CLIENT_COMPLETO_STUB = {
  ...CLIENT_STUB,
};

export const CLIENT_SEM_EMAIL_STUB = {
  ...CLIENT_STUB,
  user: {
    ...CLIENT_STUB.user,
    email: null,
  },
};

export const CLIENT_RESPONSE_STUB = {
  id: CLIENT_COMPLETO_STUB.id,
  userId: CLIENT_COMPLETO_STUB.userId,
  name: CLIENT_COMPLETO_STUB.user.name,
  phone: CLIENT_COMPLETO_STUB.user.phone,
  email: CLIENT_COMPLETO_STUB.user.email,
  phoneVerifiedAt: CLIENT_COMPLETO_STUB.phoneVerifiedAt,
  emailVerifiedAt: CLIENT_COMPLETO_STUB.emailVerifiedAt,
  active: CLIENT_COMPLETO_STUB.active,
  createdAt: CLIENT_COMPLETO_STUB.createdAt,
};

export const VERIFY_CODE_RESPONSE_STUB = {
  id: CLIENT_STUB.id,
  name: CLIENT_STUB.user.name,
  phone: CLIENT_STUB.user.phone,
  phoneVerifiedAt: CLIENT_STUB.phoneVerifiedAt,
};
