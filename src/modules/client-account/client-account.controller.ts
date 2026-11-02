import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ClientAuthGuard } from '../auth/guards/client-auth.guard';
import { ClientThrottlerGuard } from '../../shared/security/client-throttler.guard';
import { ClientAccountService } from './client-account.service';
import { UpdateClientNotificationPreferencesDto } from './dto/update-client-notification-preferences.dto';

@ApiTags('Client account')
@ApiBearerAuth()
@Controller('client-account/me')
@UseGuards(ClientAuthGuard, ClientThrottlerGuard)
export class ClientAccountController {
  constructor(private readonly clientAccountService: ClientAccountService) {}

  private getClientId(request: Request) {
    const principal = request['user'] as unknown as { sub: string };
    return principal.sub;
  }

  @Get('notification-preferences')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter preferências do cliente autenticado' })
  getNotificationPreferences(@Req() request: Request) {
    return this.clientAccountService.getNotificationPreferences(
      this.getClientId(request),
    );
  }

  @Patch('notification-preferences')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar preferências do cliente autenticado' })
  updateNotificationPreferences(
    @Req() request: Request,
    @Body() data: UpdateClientNotificationPreferencesDto,
  ) {
    return this.clientAccountService.updateNotificationPreferences(
      this.getClientId(request),
      data,
    );
  }

  @Get('loyalty')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obter resumo de fidelidade baseado em atendimentos concluídos',
  })
  getLoyaltySummary(@Req() request: Request) {
    return this.clientAccountService.getLoyaltySummary(
      this.getClientId(request),
    );
  }

  @Get('payment-methods')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar formas de pagamento salvas do cliente autenticado',
  })
  getPaymentMethods(@Req() request: Request) {
    return this.clientAccountService.getPaymentMethods(
      this.getClientId(request),
    );
  }
}
