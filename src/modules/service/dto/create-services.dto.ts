import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsNumber,
} from 'class-validator';

export class CreateServicesDto {
    
  @ApiProperty({ example: 'Corte de cabelo' })
  @IsString({ message: 'O campo [name] precisa ser uma string.' })
  @IsNotEmpty({ message: 'O campo [name] não pode estar vazio.' })
  name: string;

  @ApiProperty({ example: 50.0 })
  @IsNumber({}, { message: 'O campo [price] precisa ser um número.' })
  @Min(0, { message: 'O campo [price] não pode ser negativo.' })
  price: number;

  @ApiPropertyOptional({ example: 'Corte masculino tradicional' })
  @IsOptional()
  @IsString({ message: 'O campo [description] precisa ser uma string.' })
  description?: string;

  @ApiProperty({ example: 30 })
  @IsInt({ message: 'O campo [duration] precisa ser um número inteiro.' })
  @Min(1, { message: 'O campo [duration] deve ser maior que zero.' })
  duration: number;

  @ApiPropertyOptional({ example: 'Barbearia' })
  @IsOptional()
  @IsString({ message: 'O campo [category] precisa ser uma string.' })
  category?: string;

  @ApiPropertyOptional({ example: 'https://meusite.com/service.jpg' })
  @IsOptional()
  @IsString({ message: 'O campo [image] precisa ser uma string.' })
  image?: string;
}
