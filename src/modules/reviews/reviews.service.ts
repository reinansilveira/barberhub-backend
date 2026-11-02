import {
    Injectable,
    BadRequestException,
    ConflictException,
    ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { RespondReviewDto } from './dto/respond-review.dto';
import { AppointmentStatus, UserRole } from '@prisma/client';
import {
    AuthPrincipal,
    hasRole,
} from '../auth/types/auth-principal.type';

@Injectable()
export class ReviewsService {
    constructor(private readonly prisma: PrismaService) {}

    findAll() {
        return this.prisma.review.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async create(data: CreateReviewDto, clientId?: string) {
        const appointment = await this.prisma.appointment.findUnique({
            where: { id: data.appointmentId },
        });

        if (!appointment)
            throw new BadRequestException('Appointment não encontrado');

        if (appointment.status !== AppointmentStatus.COMPLETED)
            throw new BadRequestException('Appointment não finalizado');

        if (clientId && appointment.clientId !== clientId) {
            throw new ForbiddenException(
                'Você não pode avaliar o agendamento de outro cliente',
            );
        }

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

    async respond(id: string, data: RespondReviewDto, actor?: AuthPrincipal) {
        if (actor && !hasRole(actor, UserRole.ADMIN)) {
            const review = await this.prisma.review.findUnique({
                where: { id },
                include: { professional: { select: { userId: true } } },
            });

            if (
                !review ||
                !hasRole(actor, UserRole.PROFESSIONAL) ||
                review.professional.userId !== actor.sub
            ) {
                throw new ForbiddenException(
                    'Você não pode responder esta avaliação',
                );
            }
        }

        return this.prisma.review.update({
            where: { id },
            data: {
                response: data.response,
                respondedAt: new Date(),
            },
        });
    }
}
