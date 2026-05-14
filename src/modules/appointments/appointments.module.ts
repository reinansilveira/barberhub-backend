import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { QueuesModule } from '../../queues/queues.module';
@Module({
    imports: [PrismaModule, QueuesModule],
    controllers: [AppointmentsController],
    providers: [AppointmentsService],

})
export class AppointmentsModule { }