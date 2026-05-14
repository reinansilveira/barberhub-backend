import {
    Injectable,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { Prisma, PaymentStatus } from '@prisma/client';
@Injectable()
export class PaymentsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(status?: PaymentStatus) {
        return this.prisma.payment.findMany({
            where: {
                status: status || undefined,
            },
            include: {
                appointment: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: string) {
        const payment = await this.prisma.payment.findUnique({
            where: { id },
            include: { appointment: true },
        });

        if (!payment) {
            throw new BadRequestException('Pagamento não encontrado');
        }

        return payment;
    }

    async create(data: CreatePaymentDto) {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id: data.appointmentId },
        });

        if (!appointment) {
            throw new BadRequestException('Agendamento não encontrado');
        }

        if (appointment.status === 'CANCELLED') {
            throw new BadRequestException('Não é possível pagar um agendamento cancelado');
        }

        const existingPayment = await this.prisma.payment.findUnique({
            where: { appointmentId: data.appointmentId },
        });

        if (existingPayment) {
            throw new ConflictException('Este agendamento já possui pagamento');
        }

        const amount = Number(appointment.price);
        const discount = data.discount ?? 0;
        const finalAmount = amount - discount;

        if (finalAmount < 0) {
            throw new BadRequestException('Valor final não pode ser negativo');
        }

        return this.prisma.payment.create({
            data: {
                appointmentId: data.appointmentId,
                method: data.method,
                amount,
                discount,
                finalAmount,
                notes: data.notes,
                status: PaymentStatus.PENDING,
            },
        });
    }

    async updateStatus(id: string, dto: UpdatePaymentStatusDto) {
        const payment = await this.prisma.payment.findUnique({
            where: { id },
        });

        if (!payment) {
            throw new BadRequestException('Pagamento não encontrado');
        }

        const updateData: any = {
            status: dto.status,
        };

        if (dto.status === PaymentStatus.PAID) {
            updateData.paidAt = new Date();
        }

        if (dto.status === PaymentStatus.REFUNDED) {
            updateData.refundedAt = new Date();
        }

        return this.prisma.payment.update({
            where: { id },
            data: updateData,
        });
    }

    async delete(id: string) {
        return this.prisma.payment.delete({
            where: { id },
        });
    }
}