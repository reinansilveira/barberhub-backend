import { NotificationConsumer } from '../../../src/queues/consumers/notification.consumer';
import {
  AppointmentCreatedEvent,
  AppointmentReminderEvent,
} from '../../../src/queues/interfaces/events.interface';

describe('NotificationConsumer', () => {
  const notificationsService = {
    create: jest.fn(),
    claimPendingDelivery: jest.fn(),
    updateStatus: jest.fn(),
  };
  const sender = {
    sendEmail: jest.fn(),
    sendWhatsApp: jest.fn(),
  };
  const clientAccountService = {
    getNotificationPreferences: jest.fn(),
  };

  let consumer: NotificationConsumer;

  const createdEvent = (
    overrides: Partial<AppointmentCreatedEvent> = {},
  ): AppointmentCreatedEvent => ({
    appointmentId: 'appointment-1',
    clientId: 'client-1',
    clientUserId: 'user-client-1',
    clientName: 'Maria',
    clientPhone: '79999999999',
    clientEmail: 'maria@email.com',
    professionalId: 'professional-1',
    professionalUserId: 'user-professional-1',
    professionalName: 'Reinan',
    professionalPhone: '',
    professionalEmail: '',
    serviceName: 'Corte',
    scheduledAt: new Date('2026-11-02T10:00:00.000Z'),
    duration: 30,
    price: 50,
    ...overrides,
  });

  const reminderEvent = (
    overrides: Partial<AppointmentReminderEvent> = {},
  ): AppointmentReminderEvent => ({
    appointmentId: 'appointment-1',
    clientId: 'client-1',
    clientUserId: 'user-client-1',
    clientPhone: '79999999999',
    clientEmail: 'maria@email.com',
    serviceName: 'Corte',
    professionalName: 'Reinan',
    scheduledAt: new Date('2026-11-02T10:00:00.000Z'),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    consumer = new NotificationConsumer(
      notificationsService as any,
      sender as any,
      clientAccountService as any,
    );
  });

  it('não cria canais que o cliente desativou', async () => {
    clientAccountService.getNotificationPreferences.mockResolvedValue({
      emailEnabled: false,
      smsEnabled: true,
      whatsappEnabled: false,
      pushEnabled: true,
    });

    await consumer.handleCreated(createdEvent());

    expect(clientAccountService.getNotificationPreferences).toHaveBeenCalledWith(
      'client-1',
    );
    expect(sender.sendWhatsApp).not.toHaveBeenCalled();
    expect(sender.sendEmail).not.toHaveBeenCalled();
    expect(notificationsService.create).not.toHaveBeenCalled();
  });

  it('persiste dono e chaves idempotentes para os canais habilitados', async () => {
    clientAccountService.getNotificationPreferences.mockResolvedValue({
      emailEnabled: true,
      smsEnabled: true,
      whatsappEnabled: true,
      pushEnabled: true,
    });
    notificationsService.create
      .mockResolvedValueOnce({ id: 'notification-whatsapp', status: 'PENDING' })
      .mockResolvedValueOnce({ id: 'notification-email', status: 'PENDING' });
    notificationsService.claimPendingDelivery.mockResolvedValue(true);

    await consumer.handleReminder(reminderEvent());

    expect(notificationsService.create).toHaveBeenNthCalledWith(1, {
      appointmentId: 'appointment-1',
      recipientUserId: 'user-client-1',
      recipient: '79999999999',
      type: 'WHATSAPP',
      subject: expect.any(String),
      message: expect.any(String),
      idempotencyKey: 'appointments.reminder:appointment-1:client:WHATSAPP',
    });
    expect(notificationsService.create).toHaveBeenNthCalledWith(2, {
      appointmentId: 'appointment-1',
      recipientUserId: 'user-client-1',
      recipient: 'maria@email.com',
      type: 'EMAIL',
      subject: expect.any(String),
      message: expect.any(String),
      idempotencyKey: 'appointments.reminder:appointment-1:client:EMAIL',
    });
    expect(notificationsService.claimPendingDelivery).toHaveBeenNthCalledWith(
      1,
      'notification-whatsapp',
    );
    expect(notificationsService.claimPendingDelivery).toHaveBeenNthCalledWith(
      2,
      'notification-email',
    );
    expect(sender.sendWhatsApp).toHaveBeenCalledWith(
      '79999999999',
      expect.any(String),
    );
    expect(sender.sendEmail).toHaveBeenCalledWith(
      'maria@email.com',
      expect.any(String),
      expect.any(String),
      expect.any(String),
    );
    expect(notificationsService.updateStatus).toHaveBeenCalledWith(
      'notification-whatsapp',
      { status: 'SENT' },
    );
    expect(notificationsService.updateStatus).toHaveBeenCalledWith(
      'notification-email',
      { status: 'SENT' },
    );
  });

  it('não reenfileira um envio que a chave idempotente já marcou como enviado', async () => {
    clientAccountService.getNotificationPreferences.mockResolvedValue({
      emailEnabled: true,
      smsEnabled: true,
      whatsappEnabled: true,
      pushEnabled: true,
    });
    notificationsService.create
      .mockResolvedValueOnce({ id: 'notification-whatsapp', status: 'SENT' })
      .mockResolvedValueOnce({ id: 'notification-email', status: 'SENT' });

    await consumer.handleReminder(reminderEvent());

    expect(notificationsService.claimPendingDelivery).not.toHaveBeenCalled();
    expect(sender.sendWhatsApp).not.toHaveBeenCalled();
    expect(sender.sendEmail).not.toHaveBeenCalled();
    expect(notificationsService.updateStatus).not.toHaveBeenCalled();
  });

  it('registra FAILED quando o provedor rejeita uma entrega já reivindicada', async () => {
    clientAccountService.getNotificationPreferences.mockResolvedValue({
      emailEnabled: true,
      smsEnabled: true,
      whatsappEnabled: false,
      pushEnabled: true,
    });
    notificationsService.create.mockResolvedValue({
      id: 'notification-email',
      status: 'PENDING',
    });
    notificationsService.claimPendingDelivery.mockResolvedValue(true);
    sender.sendEmail.mockRejectedValue(new Error('Falha do provedor'));

    await consumer.handleReminder(reminderEvent({ clientPhone: '' }));

    expect(notificationsService.updateStatus).toHaveBeenCalledWith(
      'notification-email',
      { status: 'FAILED' },
    );
  });

  it('propaga uma falha de persistência para o broker redeliver o evento', async () => {
    clientAccountService.getNotificationPreferences.mockResolvedValue({
      emailEnabled: true,
      smsEnabled: true,
      whatsappEnabled: false,
      pushEnabled: true,
    });
    notificationsService.create.mockRejectedValue(new Error('Banco indisponível'));

    await expect(
      consumer.handleReminder(reminderEvent({ clientPhone: '' })),
    ).rejects.toThrow('Banco indisponível');

    expect(sender.sendEmail).not.toHaveBeenCalled();
  });

  it('envia a mensagem legível ao profissional e vincula ao usuário profissional', async () => {
    clientAccountService.getNotificationPreferences.mockResolvedValue({
      emailEnabled: false,
      smsEnabled: true,
      whatsappEnabled: false,
      pushEnabled: true,
    });
    notificationsService.create.mockResolvedValue({
      id: 'notification-professional',
      status: 'PENDING',
    });
    notificationsService.claimPendingDelivery.mockResolvedValue(true);

    await consumer.handleCreated(
      createdEvent({
        clientPhone: '',
        clientEmail: '',
        professionalPhone: '79998887766',
      }),
    );

    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: 'user-professional-1',
        recipient: '79998887766',
        type: 'WHATSAPP',
        idempotencyKey: 'appointments.created:appointment-1:professional:WHATSAPP',
        message: expect.stringContaining('Novo agendamento recebido!'),
      }),
    );
    expect(sender.sendWhatsApp).toHaveBeenCalledWith(
      '79998887766',
      expect.stringContaining('Novo agendamento recebido!'),
    );
  });
});
