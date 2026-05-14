import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationStatusDto } from './dto/update-notification-status.dto';

@ApiTags('Notifications')
@ApiBearerAuth() 
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get()
    async findAll(
        @Query('status') status?: string,
        @Query('type') type?: string,
    ) {
        return this.notificationsService.findAll(status, type);
    }

    @Get(':id')
    async findById(@Param('id') id: string) {
        return this.notificationsService.findById(id);
    }

    @Post()
    async create(@Body() dto: CreateNotificationDto) {
        return this.notificationsService.create(dto);
    }

    @Patch(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateNotificationStatusDto,
    ) {
        return this.notificationsService.updateStatus(id, dto);
    }
}