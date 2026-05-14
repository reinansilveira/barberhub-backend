import { CreateClientDto } from '../../../src/modules/clients/dto/create-client.dto';

export const makeCreateClientDto = (
  overrides?: Partial<CreateClientDto>,
): CreateClientDto => ({
  name: 'João Silva',
  phone: '+5579999999999',
  email: 'joao@email.com',
  ...overrides,
});