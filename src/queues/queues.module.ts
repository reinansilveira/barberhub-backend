import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { AppointmentProducer } from './producers/appointment.producer';
import { NotificationConsumer } from './consumers/notification.consumer';
import { ReminderConsumer } from './consumers/reminder.consumer';
import { ReminderScheduler } from './producers/reminder.scheduler';
import { NotificationsModule } from '../modules/notifications/notifications.module';

@Module({
    imports: [
        ClientsModule.register([
            {
                name: 'RABBITMQ_CLIENT',
                transport: Transport.RMQ,
                options: {
                    urls: [process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672'],
                    queue: 'barberhub_queue',
                    queueOptions: { durable: true },
                },
            },
        ]),
        ScheduleModule.forRoot(),
        NotificationsModule,
    ],
    controllers: [
        NotificationConsumer,
    ],
    providers: [
        AppointmentProducer,
        ReminderConsumer,
        ReminderScheduler,
    ],
    exports: [AppointmentProducer],
})
export class QueuesModule { }