import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { NotificationSenderService } from './sender/notification-sender.service'
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationSenderService],
    exports: [
        NotificationsService,
        NotificationSenderService,
    ],
})
export class NotificationsModule { }
