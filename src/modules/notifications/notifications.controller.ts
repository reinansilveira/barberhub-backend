import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationStatusDto } from './dto/update-notification-status.dto';
import { ClientOrProfessionalAuthGuard } from '../auth/guards/client-or-professional-auth.guard';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Notifications')
@ApiBearerAuth() 
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get('me')
    @UseGuards(ClientOrProfessionalAuthGuard)
    async findMine(@Req() request: Request) {
        const principal = request['user'] as unknown as {
            sub: string;
            accountType?: string;
            role?: UserRole;
        };

        return principal.accountType === 'CLIENT'
            ? this.notificationsService.findForClient(principal.sub)
            : this.notificationsService.findForProfessional(principal.sub);
    }

    @Patch('me/:id/status')
    @UseGuards(ClientOrProfessionalAuthGuard)
    async updateMineStatus(
        @Req() request: Request,
        @Param('id') id: string,
        @Body() dto: UpdateNotificationStatusDto,
    ) {
        const principal = request['user'] as unknown as {
            sub: string;
            accountType?: string;
        };

        return principal.accountType === 'CLIENT'
            ? this.notificationsService.updateClientStatus(principal.sub, id, dto)
            : this.notificationsService.updateProfessionalStatus(principal.sub, id, dto);
    }

    @Get()
    @UseGuards(AdminAuthGuard)
    async findAll(
        @Query('status') status?: string,
        @Query('type') type?: string,
        @Req() request?: Request,
    ) {
        return this.notificationsService.findAll(
            status,
            type,
            (request?.['user'] as { sub: string } | undefined)?.sub,
        );
    }

    @Get(':id')
    @UseGuards(AdminAuthGuard)
    async findById(@Param('id') id: string) {
        return this.notificationsService.findById(id);
    }

    @Post()
    @UseGuards(AdminAuthGuard)
    async create(@Body() dto: CreateNotificationDto) {
        return this.notificationsService.create(dto);
    }

    @Patch(':id/status')
    @UseGuards(AdminAuthGuard)
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateNotificationStatusDto,
        @Req() request: Request,
    ) {
        if (dto.status === 'READ') {
            return this.notificationsService.markReadForViewer(
                (request['user'] as { sub: string }).sub,
                id,
            );
        }
        return this.notificationsService.updateStatus(id, dto);
    }
}
