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
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ClientResponseDto } from './dto/client-response.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Clients')
@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) { }

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

  @Delete(':id')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar cliente' })
  public desactivate(@Param('id') id: string): Promise<ClientResponseDto> {
    return this.clientService.desactivate(id);
  }
}