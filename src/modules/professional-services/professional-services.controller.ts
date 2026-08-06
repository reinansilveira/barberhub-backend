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
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Professional Services')
@ApiBearerAuth()
@Controller('professional-services')
export class ProfessionalServicesController {
  constructor(
    private readonly professionalServicesService: ProfessionalServicesService,
  ) { }

  @Public()
  @Get()
  async findAll(
    @Query('professionalId') professionalId?: string,
    @Query('active') active?: string,
  ) {
    return this.professionalServicesService.findAll(professionalId, active);
  }

  @Public()
  @Get('name/:name')
  async findByName(
    @Param('name') name: string,
    @Query('active') active?: string,
  ) {
    return this.professionalServicesService.findByName(name, active);
  }

  @Public()
  @Post()
  async create(@Body() dto: CreateProfessionalServiceDto) {
    return this.professionalServicesService.create(dto);
  }

  @Public()
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

  @Public()
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