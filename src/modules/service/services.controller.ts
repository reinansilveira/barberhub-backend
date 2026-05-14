import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    Delete,
    Query,
    Put,
} from '@nestjs/common';
import { Services } from './services.service';
import { CreateServicesDto } from './dto/create-services.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
@ApiTags('Services')
@ApiBearerAuth() 
@Controller('services')
export class ServicesController {
    constructor(private readonly services: Services) { }

    @Get()
    async findAll(@Query('active') active?: string) {
        return await this.services.findAll(active);
    }

    @Get(':id')
    async findById(
        @Param('id') id: string,
        @Query('active') active?: string,
    ) {
        return await this.services.findById(id, active);
    }

    @Post()
    async create(@Body() dto: CreateServicesDto) {
        return await this.services.create(dto);
    }

    @Put(':id')

    async update(
        @Param('id') id: string,
        @Body() dto: CreateServicesDto,
    ) {
        return await this.services.update(id, dto);
    }

    @Delete(':id')
    async deactivate(@Param('id') id: string) {
        return await this.services.deactivate(id);
    }
}
