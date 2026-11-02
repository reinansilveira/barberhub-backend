import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  Put,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ProfessionalServicesService } from './professional-services.service';
import { CreateProfessionalServiceDto } from './dto/create-professional-service.dto';
import { UpdateProfessionalServiceDto } from './dto/update-professional-service.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AdminOrProfessionalAuthGuard } from '../auth/guards/admin-or-professional-auth.guard';
import { AuthPrincipal } from '../auth/types/auth-principal.type';

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

  @Post()
  @UseGuards(AdminOrProfessionalAuthGuard)
  async create(@Body() dto: CreateProfessionalServiceDto, @Req() request: Request) {
    return this.professionalServicesService.create(
      dto,
      request['user'] as AuthPrincipal,
    );
  }

  @Put(':professionalId/:serviceId')
  @UseGuards(AdminOrProfessionalAuthGuard)
  async update(
    @Param('professionalId') professionalId: string,
    @Param('serviceId') serviceId: string,
    @Body() dto: UpdateProfessionalServiceDto,
    @Req() request: Request,
  ) {
    return this.professionalServicesService.update(
      professionalId,
      serviceId,
      dto,
      request['user'] as AuthPrincipal,
    );
  }

  @Delete(':professionalId/:serviceId')
  @UseGuards(AdminOrProfessionalAuthGuard)
  async deactivate(
    @Param('professionalId') professionalId: string,
    @Param('serviceId') serviceId: string,
    @Req() request: Request,
  ) {
    return this.professionalServicesService.deactivate(
      professionalId,
      serviceId,
      request['user'] as AuthPrincipal,
    );
  }
}
