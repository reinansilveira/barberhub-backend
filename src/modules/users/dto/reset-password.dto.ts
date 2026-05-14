import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
    @ApiProperty({ example: 'user@email.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: '483920' })
    @IsString()
    @Length(6, 6)
    code: string;

    @ApiProperty({ example: 'novaSenha123' })
    @IsString()
    @MinLength(6, { message: 'Senha mínimo 6 caracteres.' })
    newPassword: string;
}