import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  Patch,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointments.dto';
import { CancelAppointmentDto } from './dto/cancel-appointments.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { Public } from '../auth/decorators/public.decorator';
import { ClientService } from '../clients/client.service';
import { ClientAuthGuard } from '../auth/guards/client-auth.guard';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CreateOwnAppointmentDto } from './dto/create-own-appointment.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { AdminOrProfessionalAuthGuard } from '../auth/guards/admin-or-professional-auth.guard';
import { AuthPrincipal } from '../auth/types/auth-principal.type';
import { ClientThrottlerGuard } from '../../shared/security/client-throttler.guard';

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly clientService: ClientService,
  ) { }

  @Get()
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar agendamentos' })
  public findAll(@Query('status') status?: string): Promise<AppointmentResponseDto[]> {
    return this.appointmentsService.findAll(status);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar agendamento por ID' })
  public findById(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.findById(
      id,
      request['user'] as AuthPrincipal,
    );
  }

  @Post()
  @UseGuards(AdminOrProfessionalAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar agendamento por administrador ou profissional' })
  public create(@Body() dto: CreateAppointmentDto, @Req() request: Request) {
    return this.appointmentsService.createForActor(
      dto,
      request['user'] as AuthPrincipal,
    );
  }

  @Post('me')
  @UseGuards(ClientAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar agendamento para o cliente autenticado' })
  public createOwn(
    @Body() dto: CreateOwnAppointmentDto,
    @Req() request: Request,
  ) {
    return this.appointmentsService.createForClient(
      dto,
      (request['user'] as AuthPrincipal).sub,
    );
  }

  @Public()
  @Post('public')
  @UseGuards(ClientThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar agendamento público sem expor identificadores de clientes' })
  public async createPublic(@Body() dto: CreatePublicAppointmentDto) {
    const client = await this.clientService.findOrCreatePublicBookingClient({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
    });

    return this.appointmentsService.createForClient(dto, client.id);
  }

  @Put(':id/cancel')
  @UseGuards(AdminOrProfessionalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar agendamento' })
  public cancel(
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
    @Req() request: Request,
  ): Promise<AppointmentResponseDto> {
    const principal = request['user'] as AuthPrincipal;

    return this.appointmentsService.cancel(id, dto.reason, principal);
  }

  @Put('me/:id/cancel')
  @UseGuards(ClientAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar o próprio agendamento' })
  public cancelOwn(
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
    @Req() request: Request,
  ): Promise<AppointmentResponseDto> {
    const principal = request['user'] as { sub: string };
    return this.appointmentsService.cancel(id, dto.reason, {
      sub: principal.sub,
      accountType: 'CLIENT',
    });
  }

  @Put('me/:id/reschedule')
  @UseGuards(ClientAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remarcar o próprio agendamento' })
  public rescheduleOwn(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @Req() request: Request,
  ): Promise<AppointmentResponseDto> {
    const principal = request['user'] as { sub: string };
    return this.appointmentsService.reschedule(id, dto, principal.sub);
  }

  @Patch(':id/status')
  @UseGuards(AdminOrProfessionalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar status do agendamento' })
  public updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @Req() request: Request,
  ): Promise<AppointmentResponseDto> {
    const principal = request['user'] as AuthPrincipal;
    return this.appointmentsService.updateStatus(id, dto.status, principal);
  }
}
