import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class CreateClientDto {
  @ApiProperty({
    example: 'João Silva',
    description: 'Nome completo do cliente (mínimo 2 caracteres)',
  })
  @IsString({ message: 'O campo [name] deve ser um texto.' })
  @IsNotEmpty({ message: 'O campo [name] é obrigatório.' })
  name: string;

  @ApiProperty({
    example: '79999887766',
    description:
      'Telefone com DDD, apenas números (10 ou 11 dígitos). Ex: 79999887766',
  })
  @Matches(/^\d{10,11}$/, {
    message:
      'O campo [phone] deve conter apenas números com 10 ou 11 dígitos (DDD + número).',
  })
  phone: string;

  @ApiPropertyOptional({
    example: 'joao@email.com',
    description: 'Email válido (opcional)',
  })
  @IsEmail({}, { message: 'O campo [email] deve ser um email válido.' })
  email?: string;
}