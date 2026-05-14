import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';

export class CreateProfessionalServiceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'professionalId é obrigatório.' })
  professionalId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'serviceId é obrigatório.' })
  serviceId: string;

  @ApiPropertyOptional({ example: 120.0 })
  @IsOptional()
  @IsNumber({}, { message: 'customPrice deve ser numérico.' })
  @Min(0, { message: 'customPrice não pode ser negativo.' })
  customPrice?: number;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsInt({ message: 'customDuration deve ser inteiro.' })
  @Min(1, { message: 'customDuration deve ser maior que zero.' })
  customDuration?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}