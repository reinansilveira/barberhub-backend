import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationSenderService {
  private readonly logger = new Logger(NotificationSenderService.name);

  private readonly evolutionUrl = process.env.EVOLUTION_API_URL;
  private readonly evolutionKey = process.env.EVOLUTION_API_KEY;
  private readonly evolutionInstance = process.env.EVOLUTION_INSTANCE;

  async sendWhatsApp(phone: string, message: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.evolutionUrl}/message/sendText/${this.evolutionInstance}`,
        {
          method: 'POST',
          headers: {
            apikey: this.evolutionKey!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: `55${phone}`,
            text: message,
          }),
        },
      );

      if (!response.ok) throw new Error(await response.text());

      this.logger.log(`WhatsApp enviado para ${phone}`);
    } catch (err) {
      this.logger.error('Erro ao enviar WhatsApp: ', err);
    }
  }

  async sendEmail(
    email: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<void> {
    const { Resend } = await import('resend');

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: 'Notificações <onboarding@resend.dev>',
      to: email,
      subject,
      html,
      text,
    });

    if (error) {
      this.logger.error('Erro ao enviar email: ', error);
      return;
    }

    this.logger.log('Email enviado com sucesso!');
  }
}