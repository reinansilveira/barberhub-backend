import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClientResponseDto {
  @ApiProperty({ example: 'uuid-do-cliente' })
  id: string;

  @ApiProperty({ example: 'uuid-do-user' })
  userId: string;

  @ApiProperty({ example: 'João Silva' })
  name: string;

  @ApiProperty({ example: '79999887766', nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ example: 'joao@email.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'https://meusite.com/avatar.jpg' })
  avatar?: string | null;

  @ApiPropertyOptional({ example: '2026-04-19T12:00:00.000Z' })
  phoneVerifiedAt?: Date | null;

  @ApiPropertyOptional({ example: '2026-04-19T12:00:00.000Z' })
  emailVerifiedAt?: Date | null;

  @ApiProperty({ example: false })
  twoFactorEnabled: boolean;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ example: '2026-04-19T12:00:00.000Z' })
  createdAt: Date;
}
