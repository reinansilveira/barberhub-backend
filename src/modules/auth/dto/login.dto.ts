import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'joao@email.com' })
  @IsEmail({}, { message: 'O campo [email] precisa ser um e-mail válido.' })
  @IsNotEmpty({ message: 'O campo [email] é obrigatório.' })
  email: string;

  @ApiProperty({ example: 'Mest]´@23491' })
  @IsString({ message: 'O campo [password] precisa ser uma string.' })
  @IsNotEmpty({ message: 'O campo [password] é obrigatório.' })
  @MinLength(6, { message: 'O campo [password] precisa ter no mínimo 6 caracteres.' })
  password: string;
}