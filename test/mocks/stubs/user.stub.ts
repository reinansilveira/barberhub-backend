export const USER_STUB = {
  id: 'uuid-user-123',
  email: 'user@example.com',
  password: '$2b$10$hashedPasswordAqui',
  active: true,
  resetCode: null,
  resetCodeExpires: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

export const USER_PROFISSIONAL_STUB = {
  id: 'uuid-user-1',
  name: 'Carlos Barbeiro',
  email: 'carlos@barbearia.com',
  phone: '+5579988888888',
};

export const USER_COM_RESET_CODE_STUB = {
  ...USER_STUB,
  resetCode: '123456',
  resetCodeExpires: new Date(Date.now() + 15 * 60 * 1000), 
};

export const USER_COM_RESET_CODE_EXPIRADO_STUB = {
  ...USER_STUB,
  resetCode: '123456',
  resetCodeExpires: new Date(Date.now() - 1000), 
};