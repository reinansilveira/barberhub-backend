import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsEnum,
    IsUUID,
    IsObject,
} from 'class-validator';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
    @ApiProperty({ example: 'cliente@email.com ou +55999999999' })
    @IsString({ message: 'O campo [recipient] precisa ser uma string.' })
    @IsNotEmpty({ message: 'O campo [recipient] é obrigatório.' })
    recipient: string;

    @ApiProperty({ enum: NotificationType, example: NotificationType.WHATSAPP })
    @IsEnum(NotificationType, { message: 'Tipo de notificação inválido.' })
    type: NotificationType;

    @ApiPropertyOptional({ example: 'Lembrete de agendamento' })
    @IsOptional()
    @IsString({ message: 'O campo [subject] precisa ser uma string.' })
    subject?: string;

    @ApiProperty({ example: 'Sua sessão está agendada para hoje às 14:00.' })
    @IsString({ message: 'O campo [message] precisa ser uma string.' })
    @IsNotEmpty({ message: 'O campo [message] é obrigatório.' })
    message: string;

    @ApiPropertyOptional({ example: 'uuid-do-agendamento' })
    @IsOptional()
    @IsUUID('4', { message: 'O campo [appointmentId] precisa ser um UUID válido.' })
    appointmentId?: string;

    @ApiPropertyOptional({ example: { foo: 'bar' } })
    @IsOptional()
    @IsObject({ message: 'O campo [metadata] precisa ser um objeto JSON.' })
    metadata?: any;
}