import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelAppointmentDto {
  @ApiPropertyOptional({
    example: 'Paciente desmarcou com antecedência',
    description: 'Motivo do cancelamento.',
  })
  @IsOptional()
  @IsString({ message: 'O campo [reason] precisa ser uma string.' })
  @MaxLength(255, { message: 'O campo [reason] deve ter no máximo 255 caracteres.' })
  reason?: string;
}