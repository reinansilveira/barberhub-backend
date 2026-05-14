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
  ) { }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async sendReengagementMessages() {
    const now = new Date();
    const thirtyOneDaysAgo = new Date(now.getTime() - 2 * 60 * 1000);

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
    });

    this.logger.log(`Clientes inativos encontrados: ${inactiveClients.length}`);

    for (const client of inactiveClients) {
      if (!client.phone) continue;

      await this.prisma.client.update({
        where: { id: client.id },
        data: { reengagementSentAt: now },
      });

      await this.producer.publishReengagement({
        clientId: client.id,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email ?? undefined,
      });

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
        client: true,
        professional: { include: { user: true } },
        service: true,
      },
    });

    for (const apt of appointments) {
      await this.producer.publishReminder({
        appointmentId: apt.id,
        clientPhone: apt.client.phone,
        clientEmail: apt.client.email ?? undefined,
        serviceName: apt.service.name,
        professionalName: apt.professional.user.name,
        scheduledAt: apt.scheduledAt,
      });

      this.logger.log(`Lembrete agendado para appointment ${apt.id}`);
    }
  }
}