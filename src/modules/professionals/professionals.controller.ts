import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Delete,
  Put,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ProfessionalService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-profissional.dto';
import { CreateProfessionalAccountDto } from './dto/create-professional-account.dto';
import { UpdateProfessionalAvatarDto } from './dto/update-professional-avatar.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { ProfessionalAuthGuard } from '../auth/guards/professional-auth.guard';

@ApiTags('Professionals')
@ApiBearerAuth()
@Controller('professionals')
export class ProfessionalController {
  constructor(private readonly professionalService: ProfessionalService) {}

  @Public()
  @Get()
  async findAll() {
    return await this.professionalService.findAll();
  }

  @Get('me/dashboard')
  @UseGuards(ProfessionalAuthGuard)
  @HttpCode(HttpStatus.OK)
  async dashboard(@Req() request: Request) {
    const principal = request['user'] as unknown as { sub: string };
    return this.professionalService.getDashboard(principal.sub);
  }

  @Post('account')
  @UseGuards(AdminAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createAccount(@Body() dto: CreateProfessionalAccountDto) {
    return this.professionalService.createAccount(dto);
  }

  @Public()
  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.professionalService.findById(id);
  }

  @Post()
  @UseGuards(AdminAuthGuard)
  async create(@Body() dto: CreateProfessionalDto) {
    return await this.professionalService.create(dto);
  }

  @Put(':id')
  @UseGuards(AdminAuthGuard)
  async update(@Param('id') id: string, @Body() dto: CreateProfessionalDto) {
    return await this.professionalService.update(id, dto);
  }

  @Patch(':id/avatar')
  @UseGuards(AdminAuthGuard)
  async updateAvatar(
    @Param('id') id: string,
    @Body() dto: UpdateProfessionalAvatarDto,
  ) {
    return await this.professionalService.updateAvatar(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminAuthGuard)
  async deactivate(@Param('id') id: string) {
    return await this.professionalService.deactivate(id);
  }
}
