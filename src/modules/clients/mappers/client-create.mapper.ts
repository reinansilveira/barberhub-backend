import { Client, User } from '@prisma/client';
import { ClientResponseDto } from '../dto/client-response.dto';

export class ClientCreateMapper {
  static toResponse(
    client: Client & { user: Pick<User, 'name' | 'phone' | 'email'> },
  ): ClientResponseDto {
    return {
      id: client.id,
      userId: client.userId,
      name: client.user.name,
      phone: client.user.phone ?? null,
      email: client.user.email ?? undefined,
      phoneVerifiedAt: client.phoneVerifiedAt,
      emailVerifiedAt: client.emailVerifiedAt,
      active: client.active,
      createdAt: client.createdAt,
    };
  }
}
