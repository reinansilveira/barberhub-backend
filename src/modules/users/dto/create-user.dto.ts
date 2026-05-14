import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEnum,
    MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
    @ApiProperty({ example: 'user@email.com' })
    @IsEmail({}, { message: 'Email inválido.' })
    email: string;

    @ApiProperty({ example: '123456' })
    @IsString()
    @MinLength(6, { message: 'Password mínimo 6 caracteres.' })
    password: string;

    @ApiProperty({ example: 'Reinan' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ enum: UserRole })
    @IsEnum(UserRole)
    role?: UserRole;
}