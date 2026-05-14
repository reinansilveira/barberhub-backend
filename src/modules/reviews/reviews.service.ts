import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { RespondReviewDto } from './dto/respond-review.dto';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class ReviewsService {
    constructor(private readonly prisma: PrismaService) {}

    findAll() {
        return this.prisma.review.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async create(data: CreateReviewDto) {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id: data.appointmentId },
        });

        if (!appointment)
            throw new BadRequestException('Appointment não encontrado');

        if (appointment.status !== AppointmentStatus.COMPLETED)
            throw new BadRequestException('Appointment não finalizado');

        const exists = await this.prisma.review.findUnique({
            where: { appointmentId: data.appointmentId },
        });

        if (exists)
            throw new ConflictException('Review já cadastrada');

        return this.prisma.review.create({
            data: {
                appointmentId: appointment.id,
                clientId: appointment.clientId,
                professionalId: appointment.professionalId,
                rating: data.rating,
                comment: data.comment,
            },
        });
    }

    async respond(id: string, data: RespondReviewDto) {
        return this.prisma.review.update({
            where: { id },
            data: {
                response: data.response,
                respondedAt: new Date(),
            },
        });
    }
}