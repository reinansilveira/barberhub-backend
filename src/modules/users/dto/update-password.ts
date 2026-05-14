import { ApiProperty } from "@nestjs/swagger";
import { isString, IsString, MinLength } from "class-validator";

export class UpdatePasswordDto {
    @ApiProperty({ example: '123456' })
    @IsString()
    currentPassword: string;

    @ApiProperty({ example: 'novaSenha123' })
    @IsString()
    @MinLength(6, { message: 'Senha mínimo 6 caracteres.' })
    newPassword: string;
}