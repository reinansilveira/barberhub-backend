import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { TwoFactorChallengeDto } from './two-factor-challenge.dto';

export class DisableTwoFactorDto extends TwoFactorChallengeDto {
  @ApiProperty({ example: 'SenhaAtual123' })
  @IsString({ message: 'A senha atual precisa ser uma string.' })
  @MinLength(1, { message: 'Informe a senha atual.' })
  currentPassword: string;
}
