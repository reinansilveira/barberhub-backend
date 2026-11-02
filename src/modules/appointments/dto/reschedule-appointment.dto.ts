import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class RescheduleAppointmentDto {
  @ApiProperty({ example: 'uuid-do-profissional' })
  @IsString({ message: 'O campo [professionalId] precisa ser uma string.' })
  @IsNotEmpty({ message: 'O campo [professionalId] não pode estar vazio.' })
  professionalId: string;

  @ApiProperty({ example: 'uuid-do-serviço' })
  @IsString({ message: 'O campo [serviceId] precisa ser uma string.' })
  @IsNotEmpty({ message: 'O campo [serviceId] não pode estar vazio.' })
  serviceId: string;

  @ApiProperty({ example: 'uuid-do-slot' })
  @IsUUID('4', { message: 'O campo [slotId] precisa ser um UUID válido.' })
  slotId: string;
}
