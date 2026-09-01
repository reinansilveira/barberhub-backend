import { Prisma, UserRole } from '@prisma/client';
import { GoogleUserDto } from '../../auth/dto/google-user.dto';

export class UserCreateMapper {
  static fromClientParams(params: {
    name: string;
    email: string | null;
    phone: string;
    password: string | null;
    passwordSetAt: Date | null;
  }): Prisma.UserCreateInput {
    return {
      name: params.name,
      email: params.email,
      phone: params.phone,
      password: params.password,
      avatar: null,
      gender: null,
      role: UserRole.CLIENT,
      active: true,
      emailVerified: false,
      mustChangePassword: false,
      passwordSetAt: params.passwordSetAt,
    };
  }

  static fromGoogleUser(
    googleUser: GoogleUserDto,
    name: string,
  ): Prisma.UserCreateInput {
    return {
      name,
      email: googleUser.email!,
      phone: null,
      password: null,
      avatar: googleUser.picture ?? null,
      gender: null,
      role: UserRole.CLIENT,
      active: true,
      emailVerified: true,
      mustChangePassword: false,
      passwordSetAt: null,
    };
  }
}
