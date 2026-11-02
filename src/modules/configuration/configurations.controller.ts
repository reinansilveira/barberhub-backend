import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigurationsService } from './configurations.service';
import { CreateConfigurationDto } from './dto/create-configuration.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

@ApiTags('Configurations')
@ApiBearerAuth() 
@Controller('configurations')
export class ConfigurationsController {
    constructor(private readonly service: ConfigurationsService) {}

    @Get()
    @UseGuards(AdminAuthGuard)
    findAll() {
        return this.service.findAll();
    }

    @Post()
    @UseGuards(AdminAuthGuard)
    create(@Body() dto: CreateConfigurationDto) {
        return this.service.create(dto);
    }

    @Put(':key')
    @UseGuards(AdminAuthGuard)
    update(@Param('key') key: string, @Body() dto: CreateConfigurationDto) {
        return this.service.update(key, dto);
    }
}
