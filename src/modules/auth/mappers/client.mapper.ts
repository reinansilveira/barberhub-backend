import { Client, User } from '@prisma/client';
import { VerifyCodeResponseDto } from '../dto/verify-code-response.dto';

export class ClientMapper {
  static toVerifyCodeResponse(
    client: Client & { user: Pick<User, 'name' | 'phone'> },
  ): VerifyCodeResponseDto {
    return {
      id: client.id,
      name: client.user.name,
      phone: client.user.phone ?? null,
      phoneVerifiedAt: client.phoneVerifiedAt,
    };
  }
}
