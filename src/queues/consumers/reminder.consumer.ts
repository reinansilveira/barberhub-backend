import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Controller()
export class ReminderConsumer {
    private readonly logger = new Logger(ReminderConsumer.name);

    constructor(private readonly prisma: PrismaService) {}

    @EventPattern('appointments.reminder')
    async handleReminder(@Payload() data: any) {
        this.logger.log(`Lembrete para: ${data.clientPhone}`);

        await this.prisma.appointment.update({
            where: { id: data.appointmentId },
            data: { reminderSent: true },
        });
    }
}