import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AppointmentClientDto {
  @ApiProperty({ example: 'uuid-do-cliente' })
  id: string;

  @ApiProperty({ example: 'João Silva' })
  name: string;

  @ApiProperty({ example: '11999999999' })
  phone: string;

  @ApiProperty({ example: 'joao@email.com' })
  email: string;
}

export class AppointmentProfessionalDto {
  @ApiProperty({ example: 'uuid-do-profissional' })
  id: string;

  @ApiProperty({ example: 'Dra. Ana Lima' })
  name: string;

  @ApiProperty({ example: 'ana@clinica.com' })
  email: string;

  @ApiPropertyOptional({ example: '11988888888' })
  phone: string | null;
}

export class AppointmentServiceDto {
  @ApiProperty({ example: 'uuid-do-servico' })
  id: string;

  @ApiProperty({ example: 'Consulta Nutricional' })
  name: string;
}

export class AppointmentResponseDto {
  @ApiProperty({ example: 'uuid-do-agendamento' })
  id: string;

  @ApiProperty({ example: '2025-06-10T14:00:00.000Z' })
  scheduledAt: Date;

  @ApiProperty({ example: 60, description: 'Duração em minutos' })
  duration: number;

  @ApiProperty({ example: 150.0 })
  price: number;

  @ApiProperty({ example: 'PENDING', enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] })
  status: string;

  @ApiPropertyOptional({ example: 'Cliente prefere atendimento rápido' })
  notes?: string | null;

  @ApiPropertyOptional({ example: 'Paciente desmarcou' })
  cancelReason?: string | null;

  @ApiProperty({ type: () => AppointmentClientDto })
  client: AppointmentClientDto;

  @ApiProperty({ type: () => AppointmentProfessionalDto })
  professional: AppointmentProfessionalDto;

  @ApiProperty({ type: () => AppointmentServiceDto })
  service: AppointmentServiceDto;
}