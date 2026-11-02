import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Delete,
  Query,
  Put,
  ParseBoolPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleItemDto } from './dto/schedule-item.dto';
import { AdminOrProfessionalAuthGuard } from '../auth/guards/admin-or-professional-auth.guard';
import { AuthPrincipal } from '../auth/types/auth-principal.type';

@ApiTags('Schedules')
@ApiBearerAuth()
@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  @UseGuards(AdminOrProfessionalAuthGuard)
  async findAll(
    @Req() request: Request,
    @Query('professionalId') professionalId?: string,
    @Query('active', new ParseBoolPipe({ optional: true })) active?: boolean,
  ) {
    return this.scheduleService.findAll(
      professionalId,
      active,
      request['user'] as AuthPrincipal,
    );
  }

  @Get(':id')
  @UseGuards(AdminOrProfessionalAuthGuard)
  async findById(@Param('id') id: string, @Req() request: Request) {
    return this.scheduleService.findById(id, request['user'] as AuthPrincipal);
  }

  @Post()
  @UseGuards(AdminOrProfessionalAuthGuard)
  async create(@Body() dto: CreateScheduleDto, @Req() request: Request) {
    return this.scheduleService.create(dto, request['user'] as AuthPrincipal);
  }

  @Put(':id')
  @UseGuards(AdminOrProfessionalAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: ScheduleItemDto,
    @Req() request: Request,
  ) {
    return this.scheduleService.update(id, dto, request['user'] as AuthPrincipal);
  }

  @Delete(':id')
  @UseGuards(AdminOrProfessionalAuthGuard)
  async deactivate(@Param('id') id: string, @Req() request: Request) {
    return this.scheduleService.deactivate(id, request['user'] as AuthPrincipal);
  }
}
