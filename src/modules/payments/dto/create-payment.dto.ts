import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { PaymentMethod } from '@prisma/client';
export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'appointmentId é obrigatório.' })
  appointmentId: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.PIX })
  @IsEnum(PaymentMethod, { message: 'Método de pagamento inválido.' })
  method: PaymentMethod;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'discount deve ser numérico.' })
  @Min(0, { message: 'discount não pode ser negativo.' })
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}