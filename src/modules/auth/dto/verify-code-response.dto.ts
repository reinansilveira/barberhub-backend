import { ApiProperty } from '@nestjs/swagger';

export class VerifyCodeResponseDto {
  @ApiProperty({ example: 'uuid-aqui' })
  id: string;

  @ApiProperty({ example: 'João Silva' })
  name: string;

  @ApiProperty({ example: '79999887766' })
  phone: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  phoneVerifiedAt: Date;
}