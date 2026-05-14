import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString({ message: 'O campo [refresh_token] precisa ser uma string.' })
  @IsNotEmpty({ message: 'O campo [refresh_token] é obrigatório.' })
  refresh_token: string;
}