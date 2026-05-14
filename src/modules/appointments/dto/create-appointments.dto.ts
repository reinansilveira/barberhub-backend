import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'uuid-do-cliente' })
  @IsString({ message: 'O campo [clientId] precisa ser uma string.' })
  @IsNotEmpty({ message: 'O campo [clientId] não pode estar vazio.' })
  clientId: string;

  @ApiProperty({ example: 'uuid-do-profissional' })
  @IsString({ message: 'O campo [professionalId] precisa ser uma string.' })
  @IsNotEmpty({ message: 'O campo [professionalId] não pode estar vazio.' })
  professionalId: string;

  @ApiProperty({
    example: 'uuid-do-serviço',
    description: 'ID do serviço. Deve estar vinculado ao profissional informado.'
  })
  @IsString({ message: 'O campo [serviceId] precisa ser uma string.' })
  @IsNotEmpty({ message: 'O campo [serviceId] não pode estar vazio.' })
  serviceId: string;

  @ApiProperty({
    example: 'uuid-do-slot',
    description: 'ID do slot de horário disponível.',
  })
  @IsUUID('4', { message: 'O campo [slotId] precisa ser um UUID válido.' })
  slotId: string;

  @ApiPropertyOptional({ example: 'Cliente prefere atendimento rápido' })
  @IsOptional()
  @IsString({ message: 'O campo [notes] precisa ser uma string.' })
  notes?: string;
}
