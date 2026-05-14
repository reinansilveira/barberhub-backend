import { CreateServicesDto } from '../../../src/modules/service/dto/create-services.dto';

export const makeCreateServiceDto = (
  overrides?: Partial<CreateServicesDto>,
): CreateServicesDto => ({
  name: 'Corte Masculino',
  price: 45.0,
  duration: 30,
  ...overrides,
});