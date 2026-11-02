import { OmitType } from '@nestjs/swagger';
import { CreateAppointmentDto } from './create-appointments.dto';

export class CreateOwnAppointmentDto extends OmitType(CreateAppointmentDto, [
  'clientId',
] as const) {}
