import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: AppointmentStatus, example: AppointmentStatus.COMPLETED })
  @IsEnum(AppointmentStatus, { message: 'Status de agendamento inválido.' })
  status: AppointmentStatus;
}
