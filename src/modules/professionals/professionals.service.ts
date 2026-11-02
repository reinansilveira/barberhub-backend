import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, UserRole } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { generateTempPassword } from '../../shared/security/generate-temp-password';
import { CreateProfessionalDto } from './dto/create-profissional.dto';
import { CreateProfessionalAccountDto } from './dto/create-professional-account.dto';

const professionalUserSelect = {
  id: true,
  name: true,
  avatar: true,
} as const;

const professionalWithSafeUser = {
  user: { select: professionalUserSelect },
} as const;

@Injectable()
export class ProfessionalService {
  constructor(private readonly prisma: PrismaService) { }

  async createAccount(data: CreateProfessionalAccountDto) {
    const email = data.email.trim().toLowerCase();
    const phone = data.phone?.trim() || undefined;
    const duplicate = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
        ],
      },
      select: { email: true, phone: true },
    });

    if (duplicate?.email === email) {
      throw new ConflictException('Email já cadastrado');
    }

    if (phone && duplicate?.phone === phone) {
      throw new ConflictException('Telefone já cadastrado');
    }

    const temporaryPassword = generateTempPassword();
    const password = await bcrypt.hash(temporaryPassword, 10);

    let professional;

    try {
      professional = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: data.name.trim(),
            email,
            phone,
            password,
            passwordSetAt: new Date(),
            role: UserRole.PROFESSIONAL,
            roleAssignments: {
              create: { role: UserRole.PROFESSIONAL },
            },
          },
        });

        return tx.professional.create({
          data: {
            userId: user.id,
            specialty: data.specialty?.trim() || undefined,
            bio: data.bio?.trim() || undefined,
            experience: data.experience,
            commission: data.commission,
          },
          include: professionalWithSafeUser,
        });
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email ou telefone já cadastrado');
      }

      throw error;
    }

    return { professional, temporaryPassword };
  }

  async getDashboard(userId: string) {
    const professional = await this.prisma.professional.findFirst({
      where: {
        userId,
        active: true,
        user: {
          is: {
            active: true,
          },
        },
      },
      select: {
        id: true,
        specialty: true,
        bio: true,
        experience: true,
        commission: true,
        rating: true,
        totalReviews: true,
        user: {
          select: {
            name: true,
            avatar: true,
          },
        },
        appointments: {
          orderBy: { scheduledAt: 'desc' },
          select: {
            id: true,
            scheduledAt: true,
            startedAt: true,
            completedAt: true,
            status: true,
            duration: true,
            price: true,
            client: {
              select: {
                id: true,
                user: {
                  select: {
                    name: true,
                    avatar: true,
                  },
                },
              },
            },
            service: {
              select: {
                id: true,
                name: true,
                duration: true,
                price: true,
                category: true,
                image: true,
              },
            },
          },
        },
        professionalServices: {
          orderBy: { createdAt: 'desc' },
          select: {
            active: true,
            customPrice: true,
            customDuration: true,
            service: {
              select: {
                id: true,
                name: true,
                description: true,
                duration: true,
                price: true,
                category: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!professional) {
      throw new ForbiddenException('Profissional não encontrado ou inativo');
    }

    const commissionRate = Number(professional.commission);
    const completedAppointments = professional.appointments.filter(
      (appointment) => appointment.status === AppointmentStatus.COMPLETED,
    );
    const grossRevenue = completedAppointments.reduce(
      (total, appointment) => total + Number(appointment.price),
      0,
    );
    const estimatedEarnings = (grossRevenue * commissionRate) / 100;
    const toCurrencyAmount = (value: number) =>
      Math.round((value + Number.EPSILON) * 100) / 100;

    return {
      profile: {
        id: professional.id,
        name: professional.user.name,
        avatar: professional.user.avatar,
        specialty: professional.specialty,
        bio: professional.bio,
        experience: professional.experience,
        commissionRate,
        rating: Number(professional.rating ?? 0),
        totalReviews: professional.totalReviews,
      },
      appointments: professional.appointments.map((appointment) => ({
        id: appointment.id,
        scheduledAt: appointment.scheduledAt,
        startedAt: appointment.startedAt,
        completedAt: appointment.completedAt,
        status: appointment.status,
        duration: appointment.duration,
        price: Number(appointment.price),
        estimatedEarning: toCurrencyAmount(
          (Number(appointment.price) * commissionRate) / 100,
        ),
        client: {
          id: appointment.client.id,
          name: appointment.client.user.name,
          avatar: appointment.client.user.avatar,
        },
        service: {
          id: appointment.service.id,
          name: appointment.service.name,
          duration: appointment.service.duration,
          price: Number(appointment.service.price),
          category: appointment.service.category,
          image: appointment.service.image,
        },
      })),
      services: professional.professionalServices.map((professionalService) => {
        const effectivePrice =
          professionalService.customPrice ?? professionalService.service.price;
        const effectiveDuration =
          professionalService.customDuration ?? professionalService.service.duration;

        return {
          active: professionalService.active,
          customPrice:
            professionalService.customPrice !== null
              ? Number(professionalService.customPrice)
              : null,
          customDuration: professionalService.customDuration,
          effectivePrice: Number(effectivePrice),
          effectiveDuration,
          service: {
            id: professionalService.service.id,
            name: professionalService.service.name,
            description: professionalService.service.description,
            duration: professionalService.service.duration,
            price: Number(professionalService.service.price),
            category: professionalService.service.category,
            image: professionalService.service.image,
          },
        };
      }),
      earnings: {
        currency: 'BRL',
        commissionRate,
        completedAppointments: completedAppointments.length,
        grossRevenue: toCurrencyAmount(grossRevenue),
        estimatedEarnings: toCurrencyAmount(estimatedEarnings),
        averageTicket: toCurrencyAmount(
          completedAppointments.length
            ? grossRevenue / completedAppointments.length
            : 0,
        ),
      },
    };
  }

  async findAll(active?: string) {
    return this.prisma.professional.findMany({
      where: { active: active === 'false' ? false : true },
      orderBy: { createdAt: 'desc' },
      include: professionalWithSafeUser,
    });
  }

  async findById(id: string, active?: string) {
    const professional = await this.prisma.professional.findFirst({
      where: { id, active: active === 'false' ? false : true },
      include: professionalWithSafeUser,
    });

    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    return professional;
  }

  async create(data: CreateProfessionalDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    const alreadyExists = await this.prisma.professional.findUnique({
      where: { userId: data.userId },
    });

    if (alreadyExists) {
      throw new BadRequestException('Usuário já é um profissional');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.userRoleAssignment.upsert({
        where: {
          userId_role: {
            userId: data.userId,
            role: UserRole.PROFESSIONAL,
          },
        },
        update: {},
        create: { userId: data.userId, role: UserRole.PROFESSIONAL },
      });

      return tx.professional.create({
        data: {
          userId: data.userId,
          specialty: data.specialty,
          bio: data.bio,
          experience: data.experience,
          commission: data.commission,
        },
        include: professionalWithSafeUser,
      });
    });
  }

  async update(id: string, data: Partial<CreateProfessionalDto>) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
    });

    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    return this.prisma.professional.update({
      where: { id },
      data: {
        specialty: data.specialty,
        bio: data.bio,
        experience: data.experience,
        commission: data.commission,
      },
      include: professionalWithSafeUser,
    });
  }

  async updateAvatar(id: string, data: { avatar: string }) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    return this.prisma.user.update({
      where: { id: professional.userId },
      data: { avatar: data.avatar },
      select: { id: true, avatar: true },
    });
  }

  async deactivate(id: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
    });

    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    return this.prisma.professional.update({
      where: { id },
      data: { active: false },
    });
  }
}
