import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { NotificationSenderService } from './sender/notification-sender.service'

@Module({
    imports: [PrismaModule],
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationSenderService],
    exports: [
        NotificationsService,
        NotificationSenderService,
    ],
})
export class NotificationsModule { }