import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangeClientPasswordDto {
  @ApiProperty({ example: 'SenhaAtual123' })
  @IsString({ message: 'A senha atual precisa ser uma string.' })
  currentPassword: string;

  @ApiProperty({ example: 'NovaSenhaSegura123' })
  @IsString({ message: 'A nova senha precisa ser uma string.' })
  @MinLength(8, { message: 'A nova senha precisa ter ao menos 8 caracteres.' })
  newPassword: string;
}
