import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { QueuesModule } from '../../queues/queues.module';
import { ClientModule } from '../clients/client.module';
import { AuthModule } from '../auth/auth.module';
import { ClientThrottlerGuard } from '../../shared/security/client-throttler.guard';
@Module({
    imports: [PrismaModule, QueuesModule, ClientModule, AuthModule],
    controllers: [AppointmentsController],
    providers: [AppointmentsService, ClientThrottlerGuard],

})
export class AppointmentsModule { }
