import { Matches } from 'class-validator';

export class SendCodeDto {
  @Matches(/^\d{10,11}$/, {
    message: 'O telefone deve conter apenas números com 10 ou 11 dígitos (DDD + número).',
  })
  phone: string;
}