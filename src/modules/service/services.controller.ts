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
import { Public } from '../auth/decorators/public.decorator';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { UseGuards } from '@nestjs/common';
@ApiTags('Services')
@ApiBearerAuth() 
@Controller('services')
export class ServicesController {
    constructor(private readonly services: Services) { }

    @Public()
    @Get()
    async findAll(@Query('active') active?: string) {
        return await this.services.findAll(active);
    }

    @Public()
    @Get(':id')
    async findById(
        @Param('id') id: string,
        @Query('active') active?: string,
    ) {
        return await this.services.findById(id, active);
    }

    @Post()
    @UseGuards(AdminAuthGuard)
    async create(@Body() dto: CreateServicesDto) {
        return await this.services.create(dto);
    }

    @Put(':id')
    @UseGuards(AdminAuthGuard)

    async update(
        @Param('id') id: string,
        @Body() dto: CreateServicesDto,
    ) {
        return await this.services.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(AdminAuthGuard)
    async deactivate(@Param('id') id: string) {
        return await this.services.deactivate(id);
    }
}
