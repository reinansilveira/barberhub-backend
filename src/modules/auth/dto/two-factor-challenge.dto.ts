import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, Matches } from 'class-validator';

export class TwoFactorChallengeDto {
  @ApiProperty({ example: 'b9ddcd87-7b14-4c87-a59f-1e661d87821e' })
  @IsUUID('4', { message: 'Desafio de segurança inválido.' })
  challengeId: string;

  @ApiProperty({ example: '483920' })
  @Matches(/^\d{6}$/, {
    message: 'O código deve conter exatamente 6 dígitos.',
  })
  code: string;
}
