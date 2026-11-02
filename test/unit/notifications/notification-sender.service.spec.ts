import { NotificationSenderService } from '../../../src/modules/notifications/sender/notification-sender.service';

describe('NotificationSenderService', () => {
  const originalResendApiKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-key';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalResendApiKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalResendApiKey;
    }
  });

  it('propaga erro do WhatsApp para o consumer registrar FAILED', async () => {
    const service = new NotificationSenderService();
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      text: async () => 'Provedor indisponível',
    } as Response);

    await expect(
      service.sendWhatsApp('79999999999', 'Mensagem de teste'),
    ).rejects.toThrow('Provedor indisponível');
  });

  it('propaga erro do e-mail para o consumer registrar FAILED', async () => {
    const service = new NotificationSenderService();
    (service as any).resend = {
      emails: {
        send: jest.fn().mockResolvedValue({
          error: { message: 'Resend indisponível' },
        }),
      },
    };

    await expect(
      service.sendEmail(
        'maria@email.com',
        'Teste',
        '<p>Teste</p>',
        'Teste',
      ),
    ).rejects.toThrow('Resend indisponível');
  });
});
