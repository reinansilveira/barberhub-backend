import {
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyCodeDto {
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

  @Matches(/^\d{6}$/, {
    message: 'O código deve conter exatamente 6 dígitos.',
  })
  @ApiProperty({
    example: '021123',
  })
  @IsNotEmpty({ message: 'O campo code é obrigatório.' })
  code: string;
}