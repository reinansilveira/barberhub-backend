import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointments.dto';
import { CancelAppointmentDto } from './dto/cancel-appointments.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { Public } from '../auth/decorators/public.decorator';
import { ClientService } from '../clients/client.service';
import { AuthService } from '../auth/auth.service';

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly clientService: ClientService,
    private readonly authService: AuthService,
  ) { }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar agendamentos' })
  public findAll(@Query('status') status?: string): Promise<AppointmentResponseDto[]> {
    return this.appointmentsService.findAll(status);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar agendamento por ID' })
  public findById(@Param('id') id: string): Promise<AppointmentResponseDto> {
    return this.appointmentsService.findById(id);
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo agendamento' })
  public async create(@Body() dto: CreateAppointmentDto) {
    const credentials = await this.clientService.ensureCredentials(dto.clientId);
    const appointment = await this.appointmentsService.create(dto, undefined, credentials.plainPassword);
    const session = await this.authService.issueClientSession(dto.clientId);

    return { appointment, session };
  }

  @Put(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancelar agendamento' })
  public cancel(
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.cancel(id, dto.reason);
  }
}
