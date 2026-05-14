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
import { ProfessionalService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-profissional.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
@ApiTags('Professionals')
@ApiBearerAuth() 
@Controller('professionals')
export class ProfessionalController {
    constructor(private readonly professionalService: ProfessionalService) { }

    @Get()
    async findAll(@Query('active') active?: string) {
        return await this.professionalService.findAll(active);
    }

    @Get(':id')
    async findById(
        @Param('id') id: string,
        @Query('active') active?: string,
    ) {
        return await this.professionalService.findById(id, active);
    }

    @Post()
    async create(@Body() dto: CreateProfessionalDto) {
        return await this.professionalService.create(dto);
    }

    @Put(':id')

    async update(
        @Param('id') id: string,
        @Body() dto: CreateProfessionalDto,
    ) {
        return await this.professionalService.update(id, dto);
    }

    @Delete(':id')
    async deactivate(@Param('id') id: string) {
        return await this.professionalService.deactivate(id);
    }
}
