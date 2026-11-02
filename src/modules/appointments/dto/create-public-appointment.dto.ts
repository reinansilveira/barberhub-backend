import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { CreateOwnAppointmentDto } from './create-own-appointment.dto';

export class CreatePublicAppointmentDto extends CreateOwnAppointmentDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'maria@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '79999999999' })
  @Matches(/^\d{10,11}$/)
  phone: string;
}
