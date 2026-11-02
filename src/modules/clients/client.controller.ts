import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
  ParseBoolPipe,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { CreateClientRegisterDto } from './dto/create-client-register.dto';
import { UpdateClientAvatarDto } from './dto/update-client-avatar.dto';
import { ClientResponseDto } from './dto/client-response.dto';
import { Public } from '../auth/decorators/public.decorator';
import { ClientAuthGuard } from '../auth/guards/client-auth.guard';
import { GoogleClientAuthGuard } from '../auth/guards/google-client-auth.guard';
import { GoogleUserDto } from '../auth/dto/google-user.dto';
import { ClientThrottlerGuard } from '../../shared/security/client-throttler.guard';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import {
  AuthPrincipal,
  hasRole,
  isBackOfficePrincipal,
} from '../auth/types/auth-principal.type';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  private ensureIsOwner(request: Request, id: string) {
    const principal = request['user'] as unknown as { sub: string };

    if (principal.sub !== id) {
      throw new ForbiddenException('Você não pode alterar outro cliente');
    }
  }

  private ensureCanRead(request: Request, id: string) {
    const principal = request['user'] as AuthPrincipal;

    if (
      (principal.accountType === 'CLIENT' && principal.sub === id) ||
      (isBackOfficePrincipal(principal) && hasRole(principal, UserRole.ADMIN))
    ) {
      return;
    }

    throw new ForbiddenException('Você não pode acessar outro cliente');
  }

  @Get('me/dashboard')
  @UseGuards(ClientAuthGuard, ClientThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter dashboard do cliente autenticado' })
  public dashboard(@Req() request: Request) {
    const principal = request['user'] as unknown as { sub: string };
    return this.clientService.getDashboard(principal.sub);
  }

  @Public()
  @Get('google')
  @UseGuards(GoogleClientAuthGuard)
  @ApiExcludeEndpoint()
  public googleAuth() {}

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleClientAuthGuard)
  @ApiExcludeEndpoint()
  public async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const googleUser = req.user as GoogleUserDto;

    const exchangeCode = await this.clientService.createGoogleExchangeCode(
      googleUser,
    );

    const redirectUrl = new URL(`${process.env.FRONTEND_URL}/auth/callback`);
    redirectUrl.searchParams.set('code', exchangeCode);

    return res.redirect(redirectUrl.toString());
  }

  @Public()
  @Post('google/exchange')
  @UseGuards(ClientThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trocar código do Google por access + refresh token',
  })
  public googleExchange(@Body('code') code: string) {
    return this.clientService.exchangeGoogleCode(code);
  }

  @Get(':id')
  @UseGuards(ClientThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  public findById(
    @Param('id') id: string,
    @Req() request: Request,
    @Query('active', new ParseBoolPipe({ optional: true })) active?: boolean,
  ): Promise<ClientResponseDto> {
    this.ensureCanRead(request, id);
    return this.clientService.findById(id, active);
  }

  @Post()
  @UseGuards(AdminAuthGuard, ClientThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo cliente' })
  public create(@Body() dto: CreateClientDto): Promise<ClientResponseDto> {
    return this.clientService.create(dto);
  }

  @Public()
  @Post('register')
  @UseGuards(ClientThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar cliente com senha própria' })
  public register(
    @Body() dto: CreateClientRegisterDto,
  ): Promise<ClientResponseDto> {
    return this.clientService.register(dto);
  }

  @Patch(':id')
  @UseGuards(ClientAuthGuard, ClientThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar cliente' })
  public update(
    @Param('id') id: string,
    @Body() dto: CreateClientDto,
    @Req() request: Request,
  ): Promise<ClientResponseDto> {
    this.ensureIsOwner(request, id);
    return this.clientService.update(id, dto);
  }

  @Patch(':id/avatar')
  @UseGuards(ClientAuthGuard, ClientThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar avatar do cliente' })
  public updateAvatar(
    @Param('id') id: string,
    @Body() dto: UpdateClientAvatarDto,
    @Req() request: Request,
  ): Promise<ClientResponseDto> {
    this.ensureIsOwner(request, id);
    return this.clientService.updateAvatar(id, dto);
  }

  @Delete(':id')
  @UseGuards(ClientAuthGuard, ClientThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desativar cliente' })
  public desactivate(
    @Param('id') id: string,
    @Req() request: Request,
  ): Promise<ClientResponseDto> {
    this.ensureIsOwner(request, id);
    return this.clientService.desactivate(id);
  }
}
