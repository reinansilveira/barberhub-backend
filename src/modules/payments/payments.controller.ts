import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    Query,
    Patch,
    Delete,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentStatus } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Payments')
@ApiBearerAuth() 
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) { }

    @Get()
    async findAll(@Query('status') status?: PaymentStatus) {
        return this.paymentsService.findAll(status);
    }

    @Get(':id')
    async findById(@Param('id') id: string) {
        return this.paymentsService.findById(id);
    }

    @Post()
    async create(@Body() dto: CreatePaymentDto) {
        return this.paymentsService.create(dto);
    }

    @Patch(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdatePaymentStatusDto,
    ) {
        return this.paymentsService.updateStatus(id, dto);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.paymentsService.delete(id);
    }
}