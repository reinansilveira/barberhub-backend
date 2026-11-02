import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProfessionalAccountDto {
  @ApiProperty({ example: 'Enzo Ribeiro' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'enzo@barberhub.com' })
  @IsEmail({}, { message: 'Email inválido.' })
  email: string;

  @ApiPropertyOptional({ example: '+5511987654321' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Cortes masculinos' })
  @IsOptional()
  @IsString({ message: 'O campo [specialty] precisa ser uma string.' })
  specialty?: string;

  @ApiPropertyOptional({ example: 'Especialista em degradê' })
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
