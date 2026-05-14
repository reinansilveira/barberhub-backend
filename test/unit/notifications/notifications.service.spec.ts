import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';

import { NotificationsService } from '../../../src/modules/notifications/notifications.service';
import { PrismaService } from '../../../src/shared/prisma/prisma.service';

import { makePrismaMock } from '../../mocks/services/prisma.mock';
import {
  makeCreateNotificationDto,
  makeUpdateNotificationStatusDto,
} from '../../mocks/factories/notification.factory';
import {
  NOTIFICATION_STUB,
  NOTIFICATION_SEM_APPOINTMENT_STUB,
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
    jest.clearAllMocks();
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('busca todas as notificações sem filtros quando nenhum é informado', async () => {
      prismaMock.notification.findMany.mockResolvedValue([NOTIFICATION_STUB]);

      await service.findAll();

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: { status: undefined, type: undefined },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('passa o filtro de status quando informado', async () => {
      prismaMock.notification.findMany.mockResolvedValue([NOTIFICATION_STUB]);

      await service.findAll('SENT');

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: { status: 'SENT', type: undefined },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('passa o filtro de type quando informado', async () => {
      prismaMock.notification.findMany.mockResolvedValue([NOTIFICATION_STUB]);

      await service.findAll(undefined, 'WHATSAPP');

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: { status: undefined, type: 'WHATSAPP' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('passa os dois filtros juntos quando ambos são informados', async () => {
      prismaMock.notification.findMany.mockResolvedValue([NOTIFICATION_STUB]);

      await service.findAll('SENT', 'WHATSAPP');

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
        where: { status: 'SENT', type: 'WHATSAPP' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('retorna a lista de notificações', async () => {
      prismaMock.notification.findMany.mockResolvedValue([NOTIFICATION_STUB]);

      const result = await service.findAll();

      expect(result).toEqual([NOTIFICATION_STUB]);
    });

    it('retorna lista vazia quando não há notificações', async () => {
      prismaMock.notification.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('busca a notificação pelo id exato', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(NOTIFICATION_STUB);

      await service.findById('uuid-notification-1');

      expect(prismaMock.notification.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-notification-1' },
      });
    });

    it('retorna a notificação quando existe', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(NOTIFICATION_STUB);

      const result = await service.findById('uuid-notification-1');

      expect(result).toEqual(NOTIFICATION_STUB);
    });

    it('lança BadRequestException quando a notificação não existe', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(null);

      await expect(service.findById('id-inexistente')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('create', () => {
    describe('com appointmentId', () => {
      it('verifica se o appointment existe antes de criar', async () => {
        prismaMock.appointment.findUnique.mockResolvedValue(APPOINTMENT_STUB);
        prismaMock.notification.create.mockResolvedValue(NOTIFICATION_STUB);
        const dto = makeCreateNotificationDto({ appointmentId: 'uuid-appointment-1' });

        await service.create(dto);

        expect(prismaMock.appointment.findUnique).toHaveBeenCalledWith({
          where: { id: 'uuid-appointment-1' },
        });
      });

      it('lança BadRequestException quando o appointment não existe', async () => {
        prismaMock.appointment.findUnique.mockResolvedValue(null);

        await expect(
          service.create(makeCreateNotificationDto({ appointmentId: 'uuid-inexistente' })),
        ).rejects.toThrow(BadRequestException);
      });

      it('não cria a notificação quando o appointment não existe', async () => {
        prismaMock.appointment.findUnique.mockResolvedValue(null);

        await service.create(
          makeCreateNotificationDto({ appointmentId: 'uuid-inexistente' }),
        ).catch(() => {});

        expect(prismaMock.notification.create).not.toHaveBeenCalled();
      });
    });

    describe('sem appointmentId', () => {
      it('não consulta o appointment quando appointmentId não é informado', async () => {
        prismaMock.notification.create.mockResolvedValue(NOTIFICATION_SEM_APPOINTMENT_STUB);
        const dto = makeCreateNotificationDto({ appointmentId: undefined });

        await service.create(dto);

        expect(prismaMock.appointment.findUnique).not.toHaveBeenCalled();
      });
    });

    it('cria a notificação com os campos corretos do DTO', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(APPOINTMENT_STUB);
      prismaMock.notification.create.mockResolvedValue(NOTIFICATION_STUB);
      const dto = makeCreateNotificationDto();

      await service.create(dto);

      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: {
          recipient: dto.recipient,
          type: dto.type,
          subject: dto.subject,
          message: dto.message,
          appointmentId: dto.appointmentId,
          metadata: dto.metadata,
        },
      });
    });

    it('retorna a notificação criada', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(APPOINTMENT_STUB);
      prismaMock.notification.create.mockResolvedValue(NOTIFICATION_STUB);

      const result = await service.create(makeCreateNotificationDto());

      expect(result).toEqual(NOTIFICATION_STUB);
    });
  });

  describe('updateStatus', () => {
    it('verifica se a notificação existe antes de atualizar', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(NOTIFICATION_STUB);
      prismaMock.notification.update.mockResolvedValue(NOTIFICATION_STUB);

      await service.updateStatus('uuid-notification-1', makeUpdateNotificationStatusDto());

      expect(prismaMock.notification.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-notification-1' },
      });
    });

    it('lança BadRequestException quando a notificação não existe', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('id-inexistente', makeUpdateNotificationStatusDto()),
      ).rejects.toThrow(BadRequestException);
    });

    it('não chama update quando a notificação não existe', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(null);

      await service.updateStatus(
        'id-inexistente',
        makeUpdateNotificationStatusDto(),
      ).catch(() => {});

      expect(prismaMock.notification.update).not.toHaveBeenCalled();
    });

    it('define sentAt quando status é SENT', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(NOTIFICATION_STUB);
      prismaMock.notification.update.mockResolvedValue(NOTIFICATION_STUB);

      await service.updateStatus(
        'uuid-notification-1',
        makeUpdateNotificationStatusDto({ status: NotificationStatus.SENT }),
      );

      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'uuid-notification-1' },
        data: expect.objectContaining({
          status: NotificationStatus.SENT,
          sentAt: expect.any(Date),
          deliveredAt: undefined,
          readAt: undefined,
        }),
      });
    });

    it('define deliveredAt quando status é DELIVERED', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(NOTIFICATION_STUB);
      prismaMock.notification.update.mockResolvedValue(NOTIFICATION_STUB);

      await service.updateStatus(
        'uuid-notification-1',
        makeUpdateNotificationStatusDto({ status: NotificationStatus.DELIVERED }),
      );

      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'uuid-notification-1' },
        data: expect.objectContaining({
          status: NotificationStatus.DELIVERED,
          sentAt: undefined,
          deliveredAt: expect.any(Date),
          readAt: undefined,
        }),
      });
    });

    it('define readAt quando status é READ', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(NOTIFICATION_STUB);
      prismaMock.notification.update.mockResolvedValue(NOTIFICATION_STUB);

      await service.updateStatus(
        'uuid-notification-1',
        makeUpdateNotificationStatusDto({ status: NotificationStatus.READ }),
      );

      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'uuid-notification-1' },
        data: expect.objectContaining({
          status: NotificationStatus.READ,
          sentAt: undefined,
          deliveredAt: undefined,
          readAt: expect.any(Date),
        }),
      });
    });

    it('não define nenhuma data quando status é PENDING', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(NOTIFICATION_STUB);
      prismaMock.notification.update.mockResolvedValue(NOTIFICATION_STUB);

      await service.updateStatus(
        'uuid-notification-1',
        makeUpdateNotificationStatusDto({ status: NotificationStatus.PENDING }),
      );

      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'uuid-notification-1' },
        data: expect.objectContaining({
          status: NotificationStatus.PENDING,
          sentAt: undefined,
          deliveredAt: undefined,
          readAt: undefined,
        }),
      });
    });

    it('persiste o errorMessage quando informado', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(NOTIFICATION_STUB);
      prismaMock.notification.update.mockResolvedValue(NOTIFICATION_STUB);

      await service.updateStatus(
        'uuid-notification-1',
        makeUpdateNotificationStatusDto({
          status: NotificationStatus.FAILED,
          errorMessage: 'Timeout ao enviar WhatsApp',
        }),
      );

      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'uuid-notification-1' },
        data: expect.objectContaining({
          errorMessage: 'Timeout ao enviar WhatsApp',
        }),
      });
    });

    it('retorna a notificação atualizada', async () => {
      const notificacaoAtualizada = {
        ...NOTIFICATION_STUB,
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      };
      prismaMock.notification.findUnique.mockResolvedValue(NOTIFICATION_STUB);
      prismaMock.notification.update.mockResolvedValue(notificacaoAtualizada);

      const result = await service.updateStatus(
        'uuid-notification-1',
        makeUpdateNotificationStatusDto({ status: NotificationStatus.SENT }),
      );

      expect(result).toEqual(notificacaoAtualizada);
    });
  });
});