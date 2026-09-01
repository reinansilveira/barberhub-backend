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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ScheduleService } from './schedule.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleItemDto } from './dto/schedule-item.dto';

@ApiTags('Schedules')
@ApiBearerAuth()
@Controller('schedules')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  async findAll(
    @Query('professionalId') professionalId?: string,
    @Query('active', new ParseBoolPipe({ optional: true })) active?: boolean,
  ) {
    return this.scheduleService.findAll(professionalId, active);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.scheduleService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateScheduleDto) {
    return this.scheduleService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: ScheduleItemDto) {
    return this.scheduleService.update(id, dto);
  }

  @Delete(':id')
  async deactivate(@Param('id') id: string) {
    return this.scheduleService.deactivate(id);
  }
}
