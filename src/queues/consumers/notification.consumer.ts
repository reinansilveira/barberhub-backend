import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { NotificationSenderService } from '../../modules/notifications/sender/notification-sender.service';
import { ClientAccountService } from '../../modules/client-account/client-account.service';
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
  AppointmentCancelledEvent,
  AppointmentCreatedEvent,
  AppointmentNotificationEvent,
  AppointmentReminderEvent,
  ClientReengagementEvent,
} from '../interfaces/events.interface';

@Controller()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly sender: NotificationSenderService,
    private readonly clientAccountService: ClientAccountService,
  ) { }

  @EventPattern('appointments.created')
  async handleCreated(@Payload() data: AppointmentCreatedEvent) {
    this.logger.log(`Agendamento criado: ${data.appointmentId}`);

    const clientZap = buildAppointmentCreatedWhatsApp(data);
    const { subject: clientSubject, html: clientHtml, text: clientText } = buildAppointmentCreatedEmail(data);

    await this.sendNotifications({
      appointmentId: data.appointmentId,
      clientId: data.clientId,
      recipientUserId: data.clientUserId,
      eventKey: `appointments.created:${data.appointmentId}:client`,
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
      recipientUserId: data.professionalUserId,
      eventKey: `appointments.created:${data.appointmentId}:professional`,
      phone: data.professionalPhone,
      email: data.professionalEmail,
      zapMessage: profText,
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
      clientId: data.clientId,
      recipientUserId: data.clientUserId,
      eventKey: `appointments.reminder:${data.appointmentId}:client`,
      phone: data.clientPhone,
      email: data.clientEmail,
      zapMessage,
      emailSubject: subject,
      emailHtml: html,
      emailText: text,
    });
  }

  @EventPattern('appointments.confirmed')
  async handleConfirmed(@Payload() data: AppointmentCreatedEvent) {
    this.logger.log(`Agendamento confirmado: ${data.appointmentId}`);
    await this.processSimple(data, 'confirmed', 'Agendamento confirmado!');
  }

  @EventPattern('appointments.cancelled')
  async handleCancelled(@Payload() data: AppointmentCancelledEvent) {
    this.logger.log(`Agendamento cancelado: ${data.appointmentId}`);
    await this.processSimple(
      data,
      'cancelled',
      `Cancelado: ${data.cancelReason}`,
    );
  }

  @EventPattern('appointments.completed')
  async handleCompleted(@Payload() data: AppointmentCreatedEvent) {
    this.logger.log(`Agendamento concluído: ${data.appointmentId}`);
    await this.processSimple(
      data,
      'completed',
      'Atendimento concluído. Deixe sua avaliação!',
    );
  }

  @EventPattern('appointments.rescheduled')
  async handleRescheduled(@Payload() data: AppointmentCreatedEvent) {
    this.logger.log(`Agendamento remarcado: ${data.appointmentId}`);
    await this.processSimple(
      data,
      'rescheduled',
      'Agendamento remarcado com sucesso.',
    );
  }

  @EventPattern('clients.reengagement')
  async handleReengagement(@Payload() data: ClientReengagementEvent) {
    this.logger.log(`Reengajamento: ${data.clientId}`);

    const BOOKING_URL = 'https://futuraurldosite';

    const zapMessage = buildReengagementWhatsApp(data.clientName, BOOKING_URL);
    const { subject, html, text } = buildReengagementEmail(data.clientName, BOOKING_URL);

    await this.sendNotifications({
      clientId: data.clientId,
      recipientUserId: data.clientUserId,
      eventKey: `clients.reengagement:${data.clientId}:client`,
      phone: data.clientPhone,
      email: data.clientEmail,
      zapMessage,
      emailSubject: subject,
      emailHtml: html,
      emailText: text,
    });
  }

  private async processSimple(
    data: AppointmentNotificationEvent,
    eventName: string,
    message: string,
  ) {
    await this.sendNotifications({
      appointmentId: data.appointmentId,
      clientId: data.clientId,
      recipientUserId: data.clientUserId,
      eventKey: `appointments.${eventName}:${data.appointmentId}:client`,
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
    clientId?: string;
    recipientUserId?: string;
    eventKey: string;
    phone?: string;
    email?: string;
    zapMessage: string;
    emailSubject: string;
    emailHtml: string;
    emailText: string;
  }) {
    const {
      appointmentId,
      clientId,
      recipientUserId,
      eventKey,
      phone,
      email,
      zapMessage,
      emailSubject,
      emailHtml,
      emailText,
    } = params;
    const preferences = clientId
      ? await this.clientAccountService.getNotificationPreferences(clientId)
      : null;

    if (phone && preferences?.whatsappEnabled !== false) {
      await this.sendChannel(
        {
          appointmentId,
          recipientUserId,
          recipient: phone,
          type: 'WHATSAPP',
          subject: emailSubject,
          message: zapMessage,
          idempotencyKey: `${eventKey}:WHATSAPP`,
        },
        () => this.sender.sendWhatsApp(phone, zapMessage),
      );
    }

    if (email && preferences?.emailEnabled !== false) {
      await this.sendChannel(
        {
          appointmentId,
          recipientUserId,
          recipient: email,
          type: 'EMAIL',
          subject: emailSubject,
          message: emailText,
          idempotencyKey: `${eventKey}:EMAIL`,
        },
        () => this.sender.sendEmail(email, emailSubject, emailHtml, emailText),
      );
    }
  }

  private async sendChannel(
    data: {
      appointmentId?: string;
      recipientUserId?: string;
      recipient: string;
      type: 'WHATSAPP' | 'EMAIL';
      subject: string;
      message: string;
      idempotencyKey: string;
    },
    send: () => Promise<void>,
  ) {
    const notification = await this.notificationsService.create(data);

    if (notification.status !== 'PENDING') return;

    const deliveryClaimed = await this.notificationsService.claimPendingDelivery(
      notification.id,
    );
    if (!deliveryClaimed) return;

    try {
      await send();
    } catch (error: any) {
      this.logger.error(`Erro ao enviar mensagem`, error?.message || error);
      await this.notificationsService.updateStatus(notification.id, {
        status: 'FAILED',
      });
      return;
    }

    await this.notificationsService.updateStatus(notification.id, {
      status: 'SENT',
    });
  }
}
