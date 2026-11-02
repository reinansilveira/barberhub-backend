import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AppointmentProducer } from './appointment.producer';

@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly producer: AppointmentProducer,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async sendReengagementMessages() {
    const now = new Date();
    const thirtyOneDaysAgo = new Date(
      now.getTime() - 31 * 24 * 60 * 60 * 1000,
    );

    const inactiveClients = await this.prisma.client.findMany({
      where: {
        appointments: {
          every: { scheduledAt: { lte: thirtyOneDaysAgo } },
          some: { scheduledAt: { lte: thirtyOneDaysAgo } },
        },
        OR: [
          { reengagementSentAt: null },
          { reengagementSentAt: { lte: thirtyOneDaysAgo } },
        ],
      },
      include: { user: true },
    });

    this.logger.log(`Clientes inativos encontrados: ${inactiveClients.length}`);

    for (const client of inactiveClients) {
      if (!client.user.phone) continue;

      const claimed = await this.prisma.client.updateMany({
        where: {
          id: client.id,
          OR: [
            { reengagementSentAt: null },
            { reengagementSentAt: { lte: thirtyOneDaysAgo } },
          ],
        },
        data: { reengagementSentAt: now },
      });
      if (claimed.count !== 1) continue;

      try {
        await this.producer.publishReengagement({
          clientId: client.id,
          clientUserId: client.userId,
          clientName: client.user.name,
          clientPhone: client.user.phone,
          clientEmail: client.user.email ?? undefined,
        });
      } catch (error) {
        await this.prisma.client.updateMany({
          where: { id: client.id, reengagementSentAt: now },
          data: { reengagementSentAt: client.reengagementSentAt },
        });
        throw error;
      }

      this.logger.log(`Reengajamento enviado para cliente ${client.id}`);
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async sendReminders() {
    const now = new Date();
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        reminderSent: false,
        status: 'CONFIRMED',
        scheduledAt: { gte: now, lte: in25h },
      },
      include: {
        client: { include: { user: true } },
        professional: { include: { user: true } },
        service: true,
      },
    });

    for (const apt of appointments) {
      const claimed = await this.prisma.appointment.updateMany({
        where: {
          id: apt.id,
          reminderSent: false,
          status: 'CONFIRMED',
        },
        data: { reminderSent: true },
      });

      if (claimed.count !== 1) continue;

      try {
        await this.producer.publishReminder({
          appointmentId: apt.id,
          clientId: apt.clientId,
          clientUserId: apt.client.userId,
          clientPhone: apt.client.user.phone,
          clientEmail: apt.client.user.email ?? undefined,
          serviceName: apt.service.name,
          professionalName: apt.professional.user.name,
          scheduledAt: apt.scheduledAt,
        });

        this.logger.log(`Lembrete agendado para appointment ${apt.id}`);
      } catch (error) {
        await this.prisma.appointment.updateMany({
          where: {
            id: apt.id,
            reminderSent: true,
            status: 'CONFIRMED',
          },
          data: { reminderSent: false },
        });
        throw error;
      }
    }
  }
}
