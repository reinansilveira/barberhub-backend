import { RmqOptions, Transport } from '@nestjs/microservices';

export const rabbitMQConfig: RmqOptions = {
    transport: Transport.RMQ,
    options: {
        urls: [process.env.RABBITMQ_URL || 'amqp://admin:admin@localhost:5672'],
        queue: 'barberhub_queue',
        queueOptions: {
            durable: true,
        },
    },
};