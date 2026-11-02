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
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SlotsService, SlotResult, SlotBatchResult } from './slots.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { Public } from '../auth/decorators/public.decorator';
import { AdminOrProfessionalAuthGuard } from '../auth/guards/admin-or-professional-auth.guard';
import { AuthPrincipal } from '../auth/types/auth-principal.type';

@ApiTags('Slots')
@ApiBearerAuth()
@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) { }

  @Post()
  @UseGuards(AdminOrProfessionalAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar um ou múltiplos slots. Use [startsAt] para um único ou [slots] para vários.' })
  public create(
    @Body() dto: CreateSlotDto,
    @Req() request: Request,
  ): Promise<SlotResult | SlotBatchResult> {
    return this.slotsService.create(dto, request['user'] as AuthPrincipal);
  }

  @Public()
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
  @UseGuards(AdminOrProfessionalAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover slot' })
  public delete(@Param('id') id: string, @Req() request: Request): Promise<void> {
    return this.slotsService.delete(id, request['user'] as AuthPrincipal);
  }
}
