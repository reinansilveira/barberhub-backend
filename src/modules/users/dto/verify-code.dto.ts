import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyCodeDto {
    @ApiProperty({ example: 'user@email.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: '483920' })
    @IsString()
    @Length(6, 6, { message: 'Código deve ter 6 dígitos.' })
    code: string;
}