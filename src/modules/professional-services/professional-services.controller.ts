import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { ProfessionalServicesService } from './professional-services.service';
import { CreateProfessionalServiceDto } from './dto/create-professional-service.dto';
import { UpdateProfessionalServiceDto } from './dto/update-professional-service.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Professional Services')
@ApiBearerAuth() 
@Controller('professional-services')
export class ProfessionalServicesController {
  constructor(
    private readonly professionalServicesService: ProfessionalServicesService,
  ) {}

  @Get()
  async findAll(
    @Query('professionalId') professionalId?: string,
    @Query('active') active?: string,
  ) {
    return this.professionalServicesService.findAll(professionalId, active);
  }

  @Post()
  async create(@Body() dto: CreateProfessionalServiceDto) {
    return this.professionalServicesService.create(dto);
  }

  @Put(':professionalId/:serviceId')
  async update(
    @Param('professionalId') professionalId: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateProfessionalServiceDto,
  ) {
    return this.professionalServicesService.update(
      professionalId,
      serviceId,
      dto,
    );
  }

  @Delete(':professionalId/:serviceId')
  async deactivate(
    @Param('professionalId') professionalId: string,
    @Param('serviceId') serviceId: string,
  ) {
    return this.professionalServicesService.deactivate(
      professionalId,
      serviceId,
    );
  }
}