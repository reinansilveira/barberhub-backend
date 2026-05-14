import { Client } from '@prisma/client';
import { VerifyCodeResponseDto } from '../dto/verify-code-response.dto';

export class ClientMapper {
  static toVerifyCodeResponse(client: Client): VerifyCodeResponseDto {
    return {
      id: client.id,
      name: client.name,
      phone: client.phone,
      phoneVerifiedAt: client.phoneVerifiedAt,
    };
  }
}