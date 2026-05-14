import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, ClientProxy, Transport } from '@nestjs/microservices';
import { AppointmentCreatedEvent, AppointmentReminderEvent, ClientReengagementEvent } from '../interfaces/events.interface';

@Injectable()
export class AppointmentProducer {
    @Client({
        transport: Transport.RMQ,
        options: {
            urls: [process.env.RABBITMQ_URL],
            queue: 'barberhub_queue',
            queueOptions: { durable: true },
        },
    })
    private client: ClientProxy;

    async publishCreated(event: AppointmentCreatedEvent) {
        this.client.emit('appointments.created', event);
    }

    async publishConfirmed(event: AppointmentCreatedEvent) {
        this.client.emit('appointments.confirmed', event);
    }

    async publishCancelled(event: {
        appointmentId: string;

        clientId: string;
        clientName: string;
        clientPhone: string;
        clientEmail: string;

        professionalId: string;
        professionalName: string;
        professionalPhone: string;
        professionalEmail: string;

        serviceName: string;
        scheduledAt: Date;

        cancelReason: string;
    }) {
        this.client.emit('appointments.cancelled', event);
    }

    async publishCompleted(payload: {
        appointmentId: string;
        clientId: string;
        professionalId: string;
    }) {
        this.client.emit('appointments.completed', payload);
    }

    async publishReminder(event: AppointmentReminderEvent) {
        this.client.emit('appointments.reminder', event);
    }

    async publishReengagement(event: ClientReengagementEvent) {
        this.client.emit('clients.reengagement', event);
    }
}