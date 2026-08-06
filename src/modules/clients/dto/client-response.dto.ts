import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ClientResponseDto {
  @ApiProperty({ example: 'uuid-do-cliente' })
  id: string;

  @ApiProperty({ example: 'João Silva' })
  name: string;

  @ApiProperty({ example: '79999887766' })
  phone: string;

  @ApiPropertyOptional({ example: 'joao@email.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'https://meusite.com/uploads/avatar.jpg' })
  avatar?: string;

  @ApiProperty({ example: '2026-04-19T12:00:00.000Z' })
  createdAt: Date;
}