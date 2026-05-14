import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsInt,
    Min,
    IsBoolean,
    IsNumber,
} from 'class-validator';

export class CreateProfessionalDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    userId: string;

    @ApiPropertyOptional({ example: 'Barba' })
    @IsOptional()
    @IsString({ message: 'O campo [specialty] precisa ser uma string.' })
    specialty?: string;

    @ApiPropertyOptional({ example: 'Especialista em pigmentação' })
    @IsOptional()
    @IsString({ message: 'O campo [bio] precisa ser uma string.' })
    bio?: string;

    @ApiPropertyOptional({ example: 5 })
    @IsOptional()
    @IsInt({ message: 'O campo [experience] precisa ser um número inteiro.' })
    @Min(0, { message: 'O campo [experience] não pode ser negativo.' })
    experience?: number;

    @ApiPropertyOptional({ example: 10 })
    @IsOptional()
    @IsNumber({}, { message: 'O campo [commission] precisa ser numérico.' })
    @Min(0, { message: 'O campo [commission] não pode ser negativo.' })
    commission?: number;
}
