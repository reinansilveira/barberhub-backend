import { BadRequestException, Injectable } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UpdateClientNotificationPreferencesDto } from './dto/update-client-notification-preferences.dto';

const notificationPreferencesSelect = {
  emailEnabled: true,
  smsEnabled: true,
  whatsappEnabled: true,
  pushEnabled: true,
} as const;

@Injectable()
export class ClientAccountService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureClientExists(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!client) {
      throw new BadRequestException('Cliente não encontrado');
    }
  }

  async getNotificationPreferences(clientId: string) {
    await this.ensureClientExists(clientId);

    return this.prisma.clientNotificationPreference.upsert({
      where: { clientId },
      create: { clientId },
      update: {},
      select: notificationPreferencesSelect,
    });
  }

  async updateNotificationPreferences(
    clientId: string,
    data: UpdateClientNotificationPreferencesDto,
  ) {
    await this.ensureClientExists(clientId);

    return this.prisma.clientNotificationPreference.upsert({
      where: { clientId },
      create: { clientId, ...data },
      update: data,
      select: notificationPreferencesSelect,
    });
  }

  async getLoyaltySummary(clientId: string) {
    await this.ensureClientExists(clientId);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        clientId,
        status: AppointmentStatus.COMPLETED,
      },
      select: {
        id: true,
        price: true,
        completedAt: true,
        scheduledAt: true,
      },
      orderBy: { completedAt: 'desc' },
    });

    const totalSpent = appointments.reduce(
      (total, appointment) => total + Number(appointment.price),
      0,
    );

    return {
      completedAppointments: appointments.length,
      totalSpent,
      lastCompletedAt:
        appointments[0]?.completedAt ?? appointments[0]?.scheduledAt ?? null,
      reward: null,
    };
  }

  async getPaymentMethods(clientId: string) {
    await this.ensureClientExists(clientId);

    // O domínio atual não armazena cartões ou tokens de pagamento. Não expomos
    // transações, IDs de gateway ou qualquer dado de pagamento como substituto.
    return [];
  }
}
