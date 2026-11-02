import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationStatus } from '@prisma/client';

import { NotificationsService } from '../../../src/modules/notifications/notifications.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';
import {
  makeCreateNotificationDto,
  makeUpdateNotificationStatusDto,
} from '../../mocks/factories/notification.factory';
import { makePrismaMock } from '../../mocks/services/prisma.mock';
import {
  NOTIFICATION_SEM_APPOINTMENT_STUB,
  NOTIFICATION_STUB,
} from '../../mocks/stubs/notification.stub';
import { APPOINTMENT_STUB } from '../../mocks/stubs/appointment.stub';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prismaMock: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prismaMock = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  it('é instanciado corretamente', () => {
    expect(service).toBeDefined();
  });

  describe('consulta por destinatário', () => {
    it('busca notificações do cliente pelo dono, preservando o snapshot do contato', async () => {
      const readAt = new Date('2026-11-01T10:00:00.000Z');
      prismaMock.client.findUnique.mockResolvedValue({
        userId: 'uuid-user-client-1',
      });
      prismaMock.notification.findMany.mockResolvedValue([
        { ...NOTIFICATION_STUB, readReceipts: [{ readAt }] },
      ]);

      const result = await service.findForClient('uuid-client-1');

      expect(prismaMock.client.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-client-1' },
        select: { userId: true },
      });
      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: { recipientUserId: 'uuid-user-client-1' },
        include: {
          readReceipts: {
            where: { userId: 'uuid-user-client-1' },
            select: { readAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([{ ...NOTIFICATION_STUB, readAt }]);
    });

    it('não usa e-mail ou telefone atuais para localizar o histórico', async () => {
      prismaMock.client.findUnique.mockResolvedValue({
        userId: 'uuid-user-client-1',
      });
      prismaMock.notification.findMany.mockResolvedValue([]);

      await service.findForClient('uuid-client-1');

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recipientUserId: 'uuid-user-client-1' },
        }),
      );
    });

    it('recusa a consulta quando o cliente não existe', async () => {
      prismaMock.client.findUnique.mockResolvedValue(null);

      await expect(service.findForClient('cliente-ausente')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('busca notificações do profissional pelo usuário autenticado', async () => {
      prismaMock.professional.findUnique.mockResolvedValue({
        id: 'uuid-professional-1',
      });
      prismaMock.notification.findMany.mockResolvedValue([
        { ...NOTIFICATION_STUB, readReceipts: [] },
      ]);

      const result = await service.findForProfessional(
        'uuid-user-professional-1',
      );

      expect(prismaMock.professional.findUnique).toHaveBeenCalledWith({
        where: { userId: 'uuid-user-professional-1' },
        select: { id: true },
      });
      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recipientUserId: 'uuid-user-professional-1' },
        }),
      );
      expect(result).toEqual([{ ...NOTIFICATION_STUB, readAt: null }]);
    });

    it('recusa a consulta quando o usuário não possui perfil profissional', async () => {
      prismaMock.professional.findUnique.mockResolvedValue(null);

      await expect(
        service.findForProfessional('usuario-sem-perfil'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('recibos de leitura', () => {
    it('cria um recibo do cliente sem alterar o status de entrega', async () => {
      const readAt = new Date('2026-11-01T10:00:00.000Z');
      prismaMock.client.findUnique.mockResolvedValue({
        userId: 'uuid-user-client-1',
      });
      prismaMock.notification.findFirst.mockResolvedValue(NOTIFICATION_STUB);
      prismaMock.notificationReadReceipt.upsert.mockResolvedValue({ readAt });

      const result = await service.updateClientStatus(
        'uuid-client-1',
        NOTIFICATION_STUB.id,
        makeUpdateNotificationStatusDto({ status: NotificationStatus.READ }),
      );

      expect(prismaMock.notification.findFirst).toHaveBeenCalledWith({
        where: {
          id: NOTIFICATION_STUB.id,
          recipientUserId: 'uuid-user-client-1',
        },
      });
      expect(prismaMock.notificationReadReceipt.upsert).toHaveBeenCalledWith({
        where: {
          notificationId_userId: {
            notificationId: NOTIFICATION_STUB.id,
            userId: 'uuid-user-client-1',
          },
        },
        update: {},
        create: {
          notificationId: NOTIFICATION_STUB.id,
          userId: 'uuid-user-client-1',
        },
      });
      expect(prismaMock.notification.update).not.toHaveBeenCalled();
      expect(result).toEqual({ ...NOTIFICATION_STUB, readAt });
    });

    it('não permite ao cliente alterar status de entrega', async () => {
      await expect(
        service.updateClientStatus(
          'uuid-client-1',
          NOTIFICATION_STUB.id,
          makeUpdateNotificationStatusDto({ status: NotificationStatus.SENT }),
        ),
      ).rejects.toThrow('Usuários só podem marcar notificações como lidas');
    });

    it('impede criar recibo para notificação de outro destinatário', async () => {
      prismaMock.client.findUnique.mockResolvedValue({
        userId: 'uuid-user-client-1',
      });
      prismaMock.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.updateClientStatus(
          'uuid-client-1',
          'notificacao-de-outro-cliente',
          makeUpdateNotificationStatusDto({ status: NotificationStatus.READ }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.notificationReadReceipt.upsert).not.toHaveBeenCalled();
    });

    it('registra leitura administrativa separada da leitura do destinatário', async () => {
      const readAt = new Date('2026-11-01T10:00:00.000Z');
      prismaMock.notification.findUnique.mockResolvedValue(NOTIFICATION_STUB);
      prismaMock.notificationReadReceipt.upsert.mockResolvedValue({ readAt });

      const result = await service.markReadForViewer(
        'uuid-admin-1',
        NOTIFICATION_STUB.id,
      );

      expect(prismaMock.notificationReadReceipt.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: {
            notificationId: NOTIFICATION_STUB.id,
            userId: 'uuid-admin-1',
          },
        }),
      );
      expect(result).toEqual({ ...NOTIFICATION_STUB, readAt });
    });
  });

  describe('consulta administrativa', () => {
    it('inclui o recibo do admin que está visualizando a lista', async () => {
      const readAt = new Date('2026-11-01T10:00:00.000Z');
      prismaMock.notification.findMany.mockResolvedValue([
        { ...NOTIFICATION_STUB, readReceipts: [{ readAt }] },
      ]);

      const result = await service.findAll(
        NotificationStatus.SENT,
        'EMAIL',
        'uuid-admin-1',
      );

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: { status: NotificationStatus.SENT, type: 'EMAIL' },
        include: {
          readReceipts: {
            where: { userId: 'uuid-admin-1' },
            select: { readAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([{ ...NOTIFICATION_STUB, readAt }]);
    });

    it('retorna o registro pelo id', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(NOTIFICATION_STUB);

      await expect(service.findById(NOTIFICATION_STUB.id)).resolves.toEqual(
        NOTIFICATION_STUB,
      );
    });
  });

  describe('criação idempotente', () => {
    it('valida o agendamento antes de persistir', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(APPOINTMENT_STUB);
      prismaMock.notification.create.mockResolvedValue(NOTIFICATION_STUB);

      await service.create(makeCreateNotificationDto());

      expect(prismaMock.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-appointment-1' },
      });
    });

    it('não cria notificação para agendamento inexistente', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          makeCreateNotificationDto({ appointmentId: 'uuid-inexistente' }),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.notification.create).not.toHaveBeenCalled();
      expect(prismaMock.notification.upsert).not.toHaveBeenCalled();
    });

    it('persiste recipientUserId e snapshot ao criar sem chave de idempotência', async () => {
      const dto = makeCreateNotificationDto({
        appointmentId: undefined,
        recipientUserId: 'uuid-user-client-1',
      });
      prismaMock.notification.create.mockResolvedValue(NOTIFICATION_STUB);

      await service.create(dto);

      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: {
          recipient: dto.recipient,
          recipientUserId: dto.recipientUserId,
          idempotencyKey: undefined,
          type: dto.type,
          subject: dto.subject,
          message: dto.message,
          appointmentId: undefined,
          metadata: dto.metadata,
        },
      });
    });

    it('usa upsert quando recebe uma chave de idempotência', async () => {
      const dto = makeCreateNotificationDto({
        appointmentId: undefined,
        recipientUserId: 'uuid-user-client-1',
        idempotencyKey: 'appointments.created:appointment-1:client:EMAIL',
      });
      prismaMock.notification.upsert.mockResolvedValue(NOTIFICATION_STUB);

      await service.create(dto);

      expect(prismaMock.notification.upsert).toHaveBeenCalledWith({
        where: { idempotencyKey: dto.idempotencyKey },
        update: {},
        create: {
          recipient: dto.recipient,
          recipientUserId: dto.recipientUserId,
          idempotencyKey: dto.idempotencyKey,
          type: dto.type,
          subject: dto.subject,
          message: dto.message,
          appointmentId: undefined,
          metadata: dto.metadata,
        },
      });
      expect(prismaMock.notification.create).not.toHaveBeenCalled();
    });

    it('não consulta agendamento quando ele não é informado', async () => {
      prismaMock.notification.create.mockResolvedValue(
        NOTIFICATION_SEM_APPOINTMENT_STUB,
      );

      await service.create(makeCreateNotificationDto({ appointmentId: undefined }));

      expect(prismaMock.appointment.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('entrega', () => {
    it('reivindica apenas a primeira tentativa pendente', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        service.claimPendingDelivery(NOTIFICATION_STUB.id),
      ).resolves.toBe(true);
      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: NOTIFICATION_STUB.id,
          status: NotificationStatus.PENDING,
          attempts: 0,
        },
        data: { attempts: { increment: 1 } },
      });
    });

    it('não entrega novamente quando a notificação já foi reivindicada', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.claimPendingDelivery(NOTIFICATION_STUB.id),
      ).resolves.toBe(false);
    });

    it('não permite usar READ como status de entrega', async () => {
      await expect(
        service.updateStatus(
          NOTIFICATION_STUB.id,
          makeUpdateNotificationStatusDto({ status: NotificationStatus.READ }),
        ),
      ).rejects.toThrow('Leitura é registrada por usuário');
    });

    it('registra o primeiro envio sem sobrescrever a data existente', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(NOTIFICATION_STUB);
      prismaMock.notification.update.mockResolvedValue({
        ...NOTIFICATION_STUB,
        status: NotificationStatus.SENT,
      });

      await service.updateStatus(
        NOTIFICATION_STUB.id,
        makeUpdateNotificationStatusDto({ status: NotificationStatus.SENT }),
      );

      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: NOTIFICATION_STUB.id },
        data: {
          status: NotificationStatus.SENT,
          errorMessage: undefined,
          sentAt: expect.any(Date),
          deliveredAt: undefined,
        },
      });
    });

    it('mantém attempts no status FAILED porque ele já é incrementado no claim', async () => {
      prismaMock.notification.findUnique.mockResolvedValue({
        ...NOTIFICATION_STUB,
        attempts: 1,
      });
      prismaMock.notification.update.mockResolvedValue({
        ...NOTIFICATION_STUB,
        status: NotificationStatus.FAILED,
        attempts: 1,
      });

      await service.updateStatus(
        NOTIFICATION_STUB.id,
        makeUpdateNotificationStatusDto({
          status: NotificationStatus.FAILED,
          errorMessage: 'Timeout do provedor',
        }),
      );

      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: NOTIFICATION_STUB.id },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: 'Timeout do provedor',
          sentAt: undefined,
          deliveredAt: undefined,
        },
      });
    });

    it('recusa atualizar uma notificação inexistente', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus(
          'notificacao-ausente',
          makeUpdateNotificationStatusDto(),
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
