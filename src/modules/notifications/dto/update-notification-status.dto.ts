import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { NotificationStatus } from '@prisma/client';

export class UpdateNotificationStatusDto {
    @ApiProperty({ enum: NotificationStatus })
    @IsEnum(NotificationStatus, { message: 'Status inválido.' })
    status: NotificationStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString({ message: 'O campo [errorMessage] precisa ser string.' })
    errorMessage?: string;
}