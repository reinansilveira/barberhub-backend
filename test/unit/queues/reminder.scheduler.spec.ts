import { ReminderScheduler } from '../../../src/queues/producers/reminder.scheduler';
import { makePrismaMock } from '../../mocks/services/prisma.mock';

describe('ReminderScheduler', () => {
  const producer = {
    publishReminder: jest.fn(),
    publishReengagement: jest.fn(),
  };

  let prismaMock: ReturnType<typeof makePrismaMock>;
  let scheduler: ReminderScheduler;

  const appointment = () => ({
    id: 'appointment-1',
    clientId: 'client-1',
    client: {
      userId: 'user-client-1',
      user: {
        name: 'Maria',
        phone: '79999999999',
        email: 'maria@email.com',
      },
    },
    professional: {
      user: { name: 'Reinan' },
    },
    service: { name: 'Corte' },
    scheduledAt: new Date('2026-11-02T10:00:00.000Z'),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock = makePrismaMock();
    scheduler = new ReminderScheduler(prismaMock as any, producer as any);
  });

  it('reivindica o lembrete antes de publicar e inclui o usuário do cliente', async () => {
    prismaMock.appointment.findMany.mockResolvedValue([appointment()]);
    prismaMock.appointment.updateMany.mockResolvedValue({ count: 1 });

    await scheduler.sendReminders();

    expect(prismaMock.appointment.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'appointment-1',
        reminderSent: false,
        status: 'CONFIRMED',
      },
      data: { reminderSent: true },
    });
    expect(producer.publishReminder).toHaveBeenCalledWith({
      appointmentId: 'appointment-1',
      clientId: 'client-1',
      clientUserId: 'user-client-1',
      clientPhone: '79999999999',
      clientEmail: 'maria@email.com',
      serviceName: 'Corte',
      professionalName: 'Reinan',
      scheduledAt: new Date('2026-11-02T10:00:00.000Z'),
    });
  });

  it('não publica duas vezes quando outro worker já reivindicou o lembrete', async () => {
    prismaMock.appointment.findMany.mockResolvedValue([appointment()]);
    prismaMock.appointment.updateMany.mockResolvedValue({ count: 0 });

    await scheduler.sendReminders();

    expect(producer.publishReminder).not.toHaveBeenCalled();
  });

  it('libera o lembrete se a publicação falhar', async () => {
    prismaMock.appointment.findMany.mockResolvedValue([appointment()]);
    prismaMock.appointment.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    producer.publishReminder.mockRejectedValue(new Error('Rabbit indisponível'));

    await expect(scheduler.sendReminders()).rejects.toThrow(
      'Rabbit indisponível',
    );

    expect(prismaMock.appointment.updateMany).toHaveBeenLastCalledWith({
      where: {
        id: 'appointment-1',
        reminderSent: true,
        status: 'CONFIRMED',
      },
      data: { reminderSent: false },
    });
  });

  it('reivindica o reengajamento de forma atômica e usa o dono da conta', async () => {
    prismaMock.client.findMany.mockResolvedValue([
      {
        id: 'client-1',
        userId: 'user-client-1',
        reengagementSentAt: null,
        user: {
          name: 'Maria',
          phone: '79999999999',
          email: 'maria@email.com',
        },
      },
    ]);
    prismaMock.client.updateMany.mockResolvedValue({ count: 1 });

    await scheduler.sendReengagementMessages();

    expect(prismaMock.client.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'client-1',
        OR: [
          { reengagementSentAt: null },
          { reengagementSentAt: { lte: expect.any(Date) } },
        ],
      },
      data: { reengagementSentAt: expect.any(Date) },
    });
    expect(producer.publishReengagement).toHaveBeenCalledWith({
      clientId: 'client-1',
      clientUserId: 'user-client-1',
      clientName: 'Maria',
      clientPhone: '79999999999',
      clientEmail: 'maria@email.com',
    });
  });

  it('libera o reengajamento quando a publicação falha', async () => {
    prismaMock.client.findMany.mockResolvedValue([
      {
        id: 'client-1',
        userId: 'user-client-1',
        reengagementSentAt: null,
        user: {
          name: 'Maria',
          phone: '79999999999',
          email: 'maria@email.com',
        },
      },
    ]);
    prismaMock.client.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    producer.publishReengagement.mockRejectedValue(
      new Error('Rabbit indisponível'),
    );

    await expect(scheduler.sendReengagementMessages()).rejects.toThrow(
      'Rabbit indisponível',
    );

    expect(prismaMock.client.updateMany).toHaveBeenLastCalledWith({
      where: {
        id: 'client-1',
        reengagementSentAt: expect.any(Date),
      },
      data: { reengagementSentAt: null },
    });
  });
});
