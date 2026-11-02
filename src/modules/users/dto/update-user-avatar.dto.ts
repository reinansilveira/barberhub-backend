import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateUserAvatarDto {
  @ApiProperty({ example: 'data:image/jpeg;base64,/9j/4AAQ...' })
  @IsString({ message: 'O campo [avatar] precisa ser uma string.' })
  @IsNotEmpty({ message: 'O campo [avatar] é obrigatório.' })
  @MaxLength(80_000, {
    message: 'O campo [avatar] deve ter no máximo 80000 caracteres.',
  })
  avatar: string;
}
