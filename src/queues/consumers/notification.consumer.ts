import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { NotificationSenderService } from '../../modules/notifications/sender/notification-sender.service';
import {
  buildAppointmentCreatedWhatsApp,
  buildAppointmentCreatedEmail,
  buildAppointmentReminderWhatsApp,
  buildAppointmentReminderEmail,
  buildReengagementWhatsApp,
  buildReengagementEmail,
  buildProfessionalAppointmentCreatedEmail,    
} from '../builders/notification-message.builder';
import {
  AppointmentCreatedEvent,
  AppointmentReminderEvent,
  ClientReengagementEvent,
} from '../interfaces/events.interface';

@Controller()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly sender: NotificationSenderService,
  ) { }

  @EventPattern('appointments.created')
  async handleCreated(@Payload() data: AppointmentCreatedEvent) {
    this.logger.log(`Agendamento criado: ${data.appointmentId}`);

    const clientZap = buildAppointmentCreatedWhatsApp(data);
    const { subject: clientSubject, html: clientHtml, text: clientText } = buildAppointmentCreatedEmail(data);

    await this.sendNotifications({
      appointmentId: data.appointmentId,
      phone: data.clientPhone,
      email: data.clientEmail,
      zapMessage: clientZap,
      emailSubject: clientSubject,
      emailHtml: clientHtml,
      emailText: clientText,
    });

    const { subject: profSubject, html: profHtml, text: profText } = buildProfessionalAppointmentCreatedEmail(data);

    await this.sendNotifications({
      appointmentId: data.appointmentId,
      phone: data.professionalPhone,
      email: data.professionalEmail,
      zapMessage: '',
      emailSubject: profSubject,
      emailHtml: profHtml,
      emailText: profText,
    });
  }

  @EventPattern('appointments.reminder')
  async handleReminder(@Payload() data: AppointmentReminderEvent) {
    this.logger.log(`Lembrete enviado: ${data.appointmentId}`);

    const zapMessage = buildAppointmentReminderWhatsApp(data);
    const { subject, html, text } = buildAppointmentReminderEmail(data);

    await this.sendNotifications({
      appointmentId: data.appointmentId,
      phone: data.clientPhone,
      email: data.clientEmail,
      zapMessage,
      emailSubject: subject,
      emailHtml: html,
      emailText: text,
    });
  }

  @EventPattern('appointments.confirmed')
  async handleConfirmed(@Payload() data: any) {
    this.logger.log(`Agendamento confirmado: ${data.appointmentId}`);
    await this.processSimple(data, 'Agendamento confirmado!');
  }

  @EventPattern('appointments.cancelled')
  async handleCancelled(@Payload() data: any) {
    this.logger.log(`Agendamento cancelado: ${data.appointmentId}`);
    await this.processSimple(data, `Cancelado: ${data.cancelReason}`);
  }

  @EventPattern('appointments.completed')
  async handleCompleted(@Payload() data: any) {
    this.logger.log(`Agendamento concluído: ${data.appointmentId}`);
    await this.processSimple(data, 'Atendimento concluído. Deixe sua avaliação!');
  }

  @EventPattern('clients.reengagement')
  async handleReengagement(@Payload() data: ClientReengagementEvent) {
    this.logger.log(`Reengajamento: ${data.clientId}`);

    const BOOKING_URL = 'https://futuraurldosite';

    const zapMessage = buildReengagementWhatsApp(data.clientName, BOOKING_URL);
    const { subject, html, text } = buildReengagementEmail(data.clientName, BOOKING_URL);

    await this.sendNotifications({
      phone: data.clientPhone,
      email: data.clientEmail,
      zapMessage,
      emailSubject: subject,
      emailHtml: html,
      emailText: text,
    });
  }

  private async processSimple(data: any, message: string) {
    await this.sendNotifications({
      appointmentId: data.appointmentId,
      phone: data.clientPhone,
      email: data.clientEmail,
      zapMessage: message,
      emailSubject: 'Notificação de Agendamento',
      emailHtml: `<p>${message}</p>`,
      emailText: message,
    });
  }

  private async sendNotifications(params: {
    appointmentId?: string;
    phone?: string;
    email?: string;
    zapMessage: string;
    emailSubject: string;
    emailHtml: string;
    emailText: string;
  }) {
    const { appointmentId, phone, email, zapMessage, emailSubject, emailHtml, emailText } = params;

    if (phone) {
      let notification;
      try {
        notification = await this.notificationsService.create({
          appointmentId,
          recipient: phone,
          type: 'WHATSAPP',
          subject: emailSubject,
          message: zapMessage,
        });

        await this.sender.sendWhatsApp(phone, zapMessage);

        await this.notificationsService.updateStatus(notification.id, { status: 'SENT' });
      } catch (error: any) {
        this.logger.error(`Erro ao enviar mensagem`, error?.message || error);
        if (notification) {
          await this.notificationsService.updateStatus(notification.id, { status: 'FAILED' });
        }
      }
    }

    if (email) {
      let notification;
      try {
        notification = await this.notificationsService.create({
          appointmentId,
          recipient: email,
          type: 'EMAIL',
          subject: emailSubject,
          message: emailText,
        });

        await this.sender.sendEmail(email, emailSubject, emailHtml, emailText);

        await this.notificationsService.updateStatus(notification.id, { status: 'SENT' });
      } catch (error) {
        this.logger.error(`Erro ao enviar mensagem`);
        if (notification) {
          await this.notificationsService.updateStatus(notification.id, { status: 'FAILED' });
        }
      }
    }
  }
}