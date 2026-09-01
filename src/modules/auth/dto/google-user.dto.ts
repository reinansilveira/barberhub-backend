import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleUserDto {
  @ApiProperty({ example: 'maria@email.com' })
  @IsEmail({}, { message: 'E-mail inválido' })
  @IsNotEmpty({ message: 'E-mail é obrigatório' })
  email: string;

  @ApiProperty({ example: 'Maria' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Silva' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: 'https://lh3.googleusercontent.com/a/abc123' })
  @IsString()
  @IsOptional()
  picture?: string;
}
