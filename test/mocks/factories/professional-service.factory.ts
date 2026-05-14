import { CreateProfessionalServiceDto } from '../../../src/modules/professional-services/dto/create-professional-service.dto';
import { UpdateProfessionalServiceDto } from '../../../src/modules/professional-services/dto/update-professional-service.dto';

export const makeCreateProfessionalServiceDto = (
  overrides?: Partial<CreateProfessionalServiceDto>,
): CreateProfessionalServiceDto => ({
  professionalId: 'uuid-prof-1',
  serviceId: 'uuid-service-1',
  customPrice: undefined,
  customDuration: undefined,
  active: undefined,
  ...overrides,
});

export const makeUpdateProfessionalServiceDto = (
  overrides?: Partial<UpdateProfessionalServiceDto>,
): UpdateProfessionalServiceDto => ({
  customPrice: 60.0,
  customDuration: 45,
  ...overrides,
});