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
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientAvatarDto } from './dto/update-client-avatar.dto';
import { ClientResponseDto } from './dto/client-response.dto';
import { Public } from '../auth/decorators/public.decorator';
import { ClientAuthGuard } from '../auth/client-auth.guard';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) { }

  @Get('me/dashboard')
  @UseGuards(ClientAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obter dashboard do cliente autenticado' })
  public dashboard(@Req() request: Request) {
    const principal = request['user'] as unknown as { sub: string };
    return this.clientService.getDashboard(principal.sub);
  }

  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buscar cliente por ID' })
  public findById(
    @Param('id') id: string,
    @Query('active') active?: string,
  ): Promise<ClientResponseDto> {
    return this.clientService.findById(id, active);
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar novo cliente' })
  public create(@Body() dto: CreateClientDto): Promise<ClientResponseDto> {
    return this.clientService.create(dto);
  }

  @Patch(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar cliente' })
  public update(
    @Param('id') id: string,
    @Body() dto: CreateClientDto,
  ): Promise<ClientResponseDto> {
    return this.clientService.update(id, dto);
  }

  @Patch(':id/avatar')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar avatar do cliente' })
  public updateAvatar(
    @Param('id') id: string,
    @Body() dto: UpdateClientAvatarDto,
  ): Promise<ClientResponseDto> {
    return this.clientService.updateAvatar(id, dto);
  }

  @Delete(':id')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar cliente' })
  public desactivate(@Param('id') id: string): Promise<ClientResponseDto> {
    return this.clientService.desactivate(id);
  }
}
