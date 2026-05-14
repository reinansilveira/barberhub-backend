import { CreateUserDto } from '../../../src/modules/users/dto/create-user.dto';
import { ForgotPasswordDto } from '../../../src/modules/users/dto/forgot-password.dto';
import { VerifyCodeDto } from '../../../src/modules/users/dto/verify-code.dto';
import { ResetPasswordDto } from '../../../src/modules/users/dto/reset-password.dto';
import { UpdatePasswordDto } from '../../../src/modules/users/dto/update-password';

export const makeCreateUserDto = (overrides?: Partial<CreateUserDto>): CreateUserDto => ({
  name: 'João Silva',
  email: 'user@example.com',
  password: 'S3nh@Forte!',
  ...overrides,
});

export const makeForgotPasswordDto = (
  overrides?: Partial<ForgotPasswordDto>,
): ForgotPasswordDto => ({
  email: 'user@example.com',
  ...overrides,
});

export const makeVerifyCodeDto = (overrides?: Partial<VerifyCodeDto>): VerifyCodeDto => ({
  email: 'user@example.com',
  code: '123456',
  ...overrides,
});

export const makeResetPasswordDto = (
  overrides?: Partial<ResetPasswordDto>,
): ResetPasswordDto => ({
  email: 'user@example.com',
  code: '123456',
  newPassword: 'NovaSenha@123',
  ...overrides,
});

export const makeUpdatePasswordDto = (
  overrides?: Partial<UpdatePasswordDto>,
): UpdatePasswordDto => ({
  currentPassword: 'S3nh@Forte!',
  newPassword: 'NovaSenha@123',
  ...overrides,
});