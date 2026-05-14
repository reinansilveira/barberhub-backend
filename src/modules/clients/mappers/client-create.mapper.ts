import { Client } from '@prisma/client';
import { ClientResponseDto } from '../dto/client-response.dto';

export class ClientCreateMapper {
  static toResponse(client: Client): ClientResponseDto {
    return {
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email ?? undefined,
      createdAt: client.createdAt,
    };
  }
}