import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationStatusDto } from './dto/update-notification-status.dto';

type NotificationCreateData = CreateNotificationDto & {
  recipientUserId?: string;
  idempotencyKey?: string;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getClientUserId(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { userId: true },
    });

    if (!client) {
      throw new BadRequestException('Cliente não encontrado');
    }

    return client.userId;
  }

  private async ensureProfessional(userId: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!professional) {
      throw new BadRequestException('Profissional não encontrado');
    }
  }

  private async findForRecipient(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { recipientUserId: userId },
      include: {
        readReceipts: {
          where: { userId },
          select: { readAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map(({ readReceipts, ...notification }) => ({
      ...notification,
      readAt: readReceipts[0]?.readAt ?? null,
    }));
  }

  async findForClient(clientId: string) {
    return this.findForRecipient(await this.getClientUserId(clientId));
  }

  async findForProfessional(userId: string) {
    await this.ensureProfessional(userId);
    return this.findForRecipient(userId);
  }

  async updateClientStatus(
    clientId: string,
    notificationId: string,
    data: UpdateNotificationStatusDto,
  ) {
    if (data.status !== NotificationStatus.READ) {
      throw new BadRequestException('Usuários só podem marcar notificações como lidas');
    }
    return this.markRead(await this.getClientUserId(clientId), notificationId);
  }

  async updateProfessionalStatus(
    userId: string,
    notificationId: string,
    data: UpdateNotificationStatusDto,
  ) {
    if (data.status !== NotificationStatus.READ) {
      throw new BadRequestException('Usuários só podem marcar notificações como lidas');
    }
    await this.ensureProfessional(userId);
    return this.markRead(userId, notificationId);
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, recipientUserId: userId },
    });

    if (!notification) {
      throw new BadRequestException('Notificação não encontrada');
    }

    return this.createReadReceipt(notification, userId);
  }

  async markReadForViewer(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new BadRequestException('Notificação não encontrada');
    }

    return this.createReadReceipt(notification, userId);
  }

  private async createReadReceipt(
    notification: { id: string },
    userId: string,
  ) {
    const receipt = await this.prisma.notificationReadReceipt.upsert({
      where: {
        notificationId_userId: { notificationId: notification.id, userId },
      },
      update: {},
      create: { notificationId: notification.id, userId },
    });

    return { ...notification, readAt: receipt.readAt };
  }

  async findAll(status?: string, type?: string, viewerUserId?: string) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        status: status as never,
        type: type as never,
      },
      include: viewerUserId
        ? {
            readReceipts: {
              where: { userId: viewerUserId },
              select: { readAt: true },
            },
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });

    if (!viewerUserId) return notifications;
    return notifications.map(({ readReceipts, ...notification }) => ({
      ...notification,
      readAt: readReceipts[0]?.readAt ?? null,
    }));
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

  async create(data: NotificationCreateData) {
    if (data.appointmentId) {
      const appointmentExists = await this.prisma.appointment.findUnique({
        where: { id: data.appointmentId },
      });

      if (!appointmentExists) {
        throw new BadRequestException('Appointment não encontrado');
      }
    }

    const createData = {
      recipient: data.recipient,
      recipientUserId: data.recipientUserId,
      idempotencyKey: data.idempotencyKey,
      type: data.type,
      subject: data.subject,
      message: data.message,
      appointmentId: data.appointmentId,
      metadata: data.metadata,
    };

    if (data.idempotencyKey) {
      return this.prisma.notification.upsert({
        where: { idempotencyKey: data.idempotencyKey },
        update: {},
        create: createData,
      });
    }

    return this.prisma.notification.create({ data: createData });
  }

  /**
   * Claims the first delivery attempt for an idempotent notification.
   *
   * The queue is at-least-once, so a repeated event can observe the same
   * PENDING row. Requiring `attempts = 0` makes only one consumer instance
   * responsible for that initial send without ever changing the delivery
   * status before the provider accepts it.
   */
  async claimPendingDelivery(id: string) {
    const claimed = await this.prisma.notification.updateMany({
      where: {
        id,
        status: NotificationStatus.PENDING,
        attempts: 0,
      },
      data: {
        attempts: { increment: 1 },
      },
    });

    return claimed.count === 1;
  }

  async updateStatus(id: string, data: UpdateNotificationStatusDto) {
    if (data.status === NotificationStatus.READ) {
      throw new BadRequestException('Leitura é registrada por usuário');
    }

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
          data.status === NotificationStatus.SENT && !exists.sentAt
            ? new Date()
            : undefined,
        deliveredAt:
          data.status === NotificationStatus.DELIVERED && !exists.deliveredAt
            ? new Date()
            : undefined,
      },
    });
  }
}
