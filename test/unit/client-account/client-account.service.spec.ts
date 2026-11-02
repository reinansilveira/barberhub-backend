import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClientAccountService } from '../../../src/modules/client-account/client-account.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import { makePrismaMock } from '../../mocks/services/prisma.mock';
import { CLIENT_COMPLETO_STUB } from '../../mocks/stubs/client.stub';

describe('ClientAccountService', () => {
  let service: ClientAccountService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prismaMock = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientAccountService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(ClientAccountService);
    jest.clearAllMocks();
    prismaMock.client.findUnique.mockResolvedValue({
      id: CLIENT_COMPLETO_STUB.id,
    });
  });

  describe('notification preferences', () => {
    it('cria preferências padrão para o próprio cliente quando elas não existem', async () => {
      const preferences = {
        emailEnabled: true,
        smsEnabled: true,
        whatsappEnabled: true,
        pushEnabled: true,
      };
      prismaMock.clientNotificationPreference.upsert.mockResolvedValue(
        preferences,
      );

      await expect(
        service.getNotificationPreferences(CLIENT_COMPLETO_STUB.id),
      ).resolves.toEqual(preferences);

      expect(prismaMock.clientNotificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: CLIENT_COMPLETO_STUB.id },
          create: { clientId: CLIENT_COMPLETO_STUB.id },
          update: {},
        }),
      );
    });

    it('persiste apenas os canais enviados pelo cliente autenticado', async () => {
      prismaMock.clientNotificationPreference.upsert.mockResolvedValue({
        emailEnabled: false,
        smsEnabled: true,
        whatsappEnabled: false,
        pushEnabled: true,
      });

      await service.updateNotificationPreferences(CLIENT_COMPLETO_STUB.id, {
        emailEnabled: false,
        whatsappEnabled: false,
      });

      expect(prismaMock.clientNotificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: CLIENT_COMPLETO_STUB.id },
          create: {
            clientId: CLIENT_COMPLETO_STUB.id,
            emailEnabled: false,
            whatsappEnabled: false,
          },
          update: { emailEnabled: false, whatsappEnabled: false },
        }),
      );
    });

    it('não cria preferências para um cliente inexistente', async () => {
      prismaMock.client.findUnique.mockResolvedValue(null);

      await expect(
        service.updateNotificationPreferences('cliente-inexistente', {
          emailEnabled: false,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.clientNotificationPreference.upsert).not.toHaveBeenCalled();
    });
  });

  describe('loyalty summary', () => {
    it('considera somente atendimentos concluídos e não expõe dados de terceiros', async () => {
      const completedAt = new Date('2026-10-30T12:00:00.000Z');
      prismaMock.appointment.findMany.mockResolvedValue([
        {
          id: 'appointment-2',
          price: { toString: () => '80.50' },
          completedAt,
          scheduledAt: completedAt,
        },
        {
          id: 'appointment-1',
          price: 45,
          completedAt: new Date('2026-10-15T12:00:00.000Z'),
          scheduledAt: new Date('2026-10-15T12:00:00.000Z'),
        },
      ]);

      await expect(
        service.getLoyaltySummary(CLIENT_COMPLETO_STUB.id),
      ).resolves.toEqual({
        completedAppointments: 2,
        totalSpent: 125.5,
        lastCompletedAt: completedAt,
        reward: null,
      });

      expect(prismaMock.appointment.findMany).toHaveBeenCalledWith({
        where: {
          clientId: CLIENT_COMPLETO_STUB.id,
          status: 'COMPLETED',
        },
        select: {
          id: true,
          price: true,
          completedAt: true,
          scheduledAt: true,
        },
        orderBy: { completedAt: 'desc' },
      });
    });
  });

  describe('payment methods', () => {
    it('retorna lista vazia sem consultar pagamentos ou transações', async () => {
      await expect(
        service.getPaymentMethods(CLIENT_COMPLETO_STUB.id),
      ).resolves.toEqual([]);

      expect(prismaMock.appointment.findMany).not.toHaveBeenCalled();
      expect((prismaMock as any).payment).toBeUndefined();
    });
  });
});
