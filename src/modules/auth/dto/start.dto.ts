import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class StartDto {
  @ApiProperty({
    example: '79999887766',
    description: 'Telefone com DDD, apenas números (10 ou 11 dígitos). Ex: 79999887766',
  })
  @Matches(/^\d{10,11}$/, {
    message: 'O campo [phone] deve conter apenas números com 10 ou 11 dígitos (DDD + número).',
  })
  phone: string;
}