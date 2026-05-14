import { LoginDto } from '../../../src/modules/auth/dto/login.dto';
import { StartDto } from '../../../src/modules/auth/dto/start.dto';
import { VerifyCodeDto } from '../../../src/modules/auth/dto/verify-code.dto';

export const makeLoginDto = (overrides?: Partial<LoginDto>): LoginDto => ({
  email: 'user@example.com',
  password: 'S3nh@Forte!',
  ...overrides,
});

export const makeStartDto = (overrides?: Partial<StartDto>): StartDto => ({
  phone: '+5579999999999',
  ...overrides,
});

export const makeVerifyCodeDto = (overrides?: Partial<VerifyCodeDto>): VerifyCodeDto => ({
  phone: '+5579999999999',
  code: '123456',
  ...overrides,
});