import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    Query,
    Patch,
    Delete,
    UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentStatus } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

@ApiTags('Payments')
@ApiBearerAuth() 
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Get()
    @UseGuards(AdminAuthGuard)
    async findAll(@Query('status') status?: PaymentStatus) {
        return this.paymentsService.findAll(status);
    }

    @Get(':id')
    @UseGuards(AdminAuthGuard)
    async findById(@Param('id') id: string) {
        return this.paymentsService.findById(id);
    }

    @Post()
    @UseGuards(AdminAuthGuard)
    async create(@Body() dto: CreatePaymentDto) {
        return this.paymentsService.create(dto);
    }

    @Patch(':id/status')
    @UseGuards(AdminAuthGuard)
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdatePaymentStatusDto,
    ) {
        return this.paymentsService.updateStatus(id, dto);
    }

    @Delete(':id')
    @UseGuards(AdminAuthGuard)
    async delete(@Param('id') id: string) {
        return this.paymentsService.delete(id);
    }
}
