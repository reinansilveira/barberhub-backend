import { Injectable } from '@nestjs/common';
import { Client, ClientProxy, Transport } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import {
    AppointmentCancelledEvent,
    AppointmentCreatedEvent,
    AppointmentReminderEvent,
    ClientReengagementEvent,
} from '../interfaces/events.interface';

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

    private async publish(pattern: string, event: unknown) {
        await lastValueFrom(this.client.emit(pattern, event));
    }

    async publishCreated(event: AppointmentCreatedEvent) {
        await this.publish('appointments.created', event);
    }

    async publishConfirmed(event: AppointmentCreatedEvent) {
        await this.publish('appointments.confirmed', event);
    }

    async publishCancelled(event: AppointmentCancelledEvent) {
        await this.publish('appointments.cancelled', event);
    }

    async publishCompleted(event: AppointmentCreatedEvent) {
        await this.publish('appointments.completed', event);
    }

    async publishRescheduled(event: AppointmentCreatedEvent) {
        await this.publish('appointments.rescheduled', event);
    }

    async publishReminder(event: AppointmentReminderEvent) {
        await this.publish('appointments.reminder', event);
    }

    async publishReengagement(event: ClientReengagementEvent) {
        await this.publish('clients.reengagement', event);
    }
}
