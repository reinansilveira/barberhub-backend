import { of, throwError } from 'rxjs';
import { AppointmentProducer } from '../../../src/queues/producers/appointment.producer';
import { AppointmentReminderEvent } from '../../../src/queues/interfaces/events.interface';

describe('AppointmentProducer', () => {
  const reminderEvent: AppointmentReminderEvent = {
    appointmentId: 'appointment-1',
    clientId: 'client-1',
    clientUserId: 'user-client-1',
    clientPhone: '79999999999',
    clientEmail: 'maria@email.com',
    serviceName: 'Corte',
    professionalName: 'Reinan',
    scheduledAt: new Date('2026-11-02T10:00:00.000Z'),
  };

  it('aguarda a publicação do evento no broker', async () => {
    const producer = new AppointmentProducer();
    const emit = jest.fn().mockReturnValue(of(undefined));
    (producer as any).client = { emit };

    await producer.publishReminder(reminderEvent);

    expect(emit).toHaveBeenCalledWith('appointments.reminder', reminderEvent);
  });

  it('propaga a falha do broker para que o scheduler libere a reserva', async () => {
    const producer = new AppointmentProducer();
    const emit = jest
      .fn()
      .mockReturnValue(throwError(() => new Error('Rabbit indisponível')));
    (producer as any).client = { emit };

    await expect(producer.publishReminder(reminderEvent)).rejects.toThrow(
      'Rabbit indisponível',
    );
  });
});
