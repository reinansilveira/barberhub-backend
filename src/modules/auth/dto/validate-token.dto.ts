import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ValidateTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  @IsString({ message: 'O campo [token] precisa ser uma string.' })
  @IsNotEmpty({ message: 'O campo [token] é obrigatório.' })
  token: string;
}