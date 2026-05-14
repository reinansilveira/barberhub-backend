import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsArray, IsOptional, ArrayMinSize } from 'class-validator';

export class CreateSlotDto {
  @ApiProperty({ example: '9db46d4c-edad-4680-8894-ce19e830af1b' })
  @IsUUID('4', { message: 'O campo [professionalId] precisa ser um UUID válido.' })
  professionalId: string;

  @ApiPropertyOptional({
    example: '2025-04-28T10:20:00.000Z',
    description: 'Use para criar um único slot.',
  })
  @IsOptional()
  @IsDateString({}, { message: 'O campo [startsAt] precisa ser uma data válida.' })
  startsAt?: string;

  @ApiPropertyOptional({
    example: ['2025-04-28T10:20:00.000Z', '2025-04-28T11:00:00.000Z'],
    description: 'Use para criar múltiplos slots de uma vez.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Informe ao menos um horário.' })
  @IsDateString({}, { each: true, message: 'Cada horário precisa ser uma data válida.' })
  slots?: string[];
}