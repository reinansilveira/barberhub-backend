import {
    Injectable,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationStatusDto } from './dto/update-notification-status.dto';
import { NotificationStatus } from '@prisma/client';

@Injectable()
export class NotificationsService {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(status?: string, type?: string) {
        return this.prisma.notification.findMany({
            where: {
                status: status as any,
                type: type as any,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: string) {
        const notification = await this.prisma.notification.findUnique({
            where: { id },
        });

        if (!notification) {
            throw new BadRequestException('Notificação não encontrada');
        }

        return notification;
    }

    async create(data: CreateNotificationDto) {
        if (data.appointmentId) {
            const appointmentExists = await this.prisma.appointment.findUnique({
                where: { id: data.appointmentId },
            });

            if (!appointmentExists) {
                throw new BadRequestException('Appointment não encontrado');
            }
        }

        return this.prisma.notification.create({
            data: {
                recipient: data.recipient,
                type: data.type,
                subject: data.subject,
                message: data.message,
                appointmentId: data.appointmentId,
                metadata: data.metadata,
            },
        });
    }

    async updateStatus(id: string, data: UpdateNotificationStatusDto) {
        const exists = await this.prisma.notification.findUnique({
            where: { id },
        });

        if (!exists) {
            throw new BadRequestException('Notificação não encontrada');
        }

        return this.prisma.notification.update({
            where: { id },
            data: {
                status: data.status,
                errorMessage: data.errorMessage,
                sentAt:
                    data.status === NotificationStatus.SENT
                        ? new Date()
                        : undefined,
                deliveredAt:
                    data.status === NotificationStatus.DELIVERED
                        ? new Date()
                        : undefined,
                readAt:
                    data.status === NotificationStatus.READ
                        ? new Date()
                        : undefined,
            },
        });
    }
}