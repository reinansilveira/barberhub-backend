import { Controller, Get, Post, Put, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigurationsService } from './configurations.service';
import { CreateConfigurationDto } from './dto/create-configuration.dto';

@ApiTags('Configurations')
@ApiBearerAuth() 
@Controller('configurations')
export class ConfigurationsController {
    constructor(private readonly service: ConfigurationsService) {}

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Post()
    create(@Body() dto: CreateConfigurationDto) {
        return this.service.create(dto);
    }

    @Put(':key')
    update(@Param('key') key: string, @Body() dto: CreateConfigurationDto) {
        return this.service.update(key, dto);
    }
}