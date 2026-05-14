import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SlotsService, SlotResult, SlotBatchResult } from './slots.service';
import { CreateSlotDto } from './dto/create-slot.dto';

@ApiTags('Slots')
@ApiBearerAuth()
@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar um ou múltiplos slots. Use [startsAt] para um único ou [slots] para vários.' })
  public create(@Body() dto: CreateSlotDto): Promise<SlotResult | SlotBatchResult> {
    return this.slotsService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar slots disponíveis por profissional e data' })
  public findAvailable(
    @Query('professionalId') professionalId: string,
    @Query('date') date: string,
  ): Promise<SlotResult[]> {
    return this.slotsService.findAvailable(professionalId, date);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover slot' })
  public delete(@Param('id') id: string): Promise<void> {
    return this.slotsService.delete(id);
  }
}