import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateProfessionalServiceDto } from './dto/create-professional-service.dto';
import { UpdateProfessionalServiceDto } from './dto/update-professional-service.dto';
import {
  AuthPrincipal,
  hasRole,
} from '../auth/types/auth-principal.type';

@Injectable()
export class ProfessionalServicesService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(professionalId?: string, active?: string) {
    return this.prisma.professionalService.findMany({
      where: {
        professionalId: professionalId || undefined,
        active: active === 'false' ? false : true,
      },
      include: {
        service: true,
        professional: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByName(name: string, active?: string) {
    const professional = await this.prisma.professional.findFirst({
      where: {
        active: active === 'false' ? false : true,
        user: {
          name: {
            contains: name,
            mode: 'insensitive',
          },
        },
      },
      include: {
        user: true,
      },
    });

    if (!professional) {
      throw new NotFoundException('Profissional não encontrado');
    }

    return professional;
  }

  async create(data: CreateProfessionalServiceDto, actor?: AuthPrincipal) {
    await this.assertCanManageProfessional(data.professionalId, actor);
    const professional = await this.prisma.professional.findUnique({
      where: { id: data.professionalId },
    });

    if (!professional) {
      throw new BadRequestException('Profissional não encontrado');
    }

    const service = await this.prisma.service.findUnique({
      where: { id: data.serviceId },
    });

    if (!service) {
      throw new BadRequestException('Serviço não encontrado');
    }

    const exists = await this.prisma.professionalService.findUnique({
      where: {
        professionalId_serviceId: {
          professionalId: data.professionalId,
          serviceId: data.serviceId,
        },
      },
    });

    if (exists) {
      throw new ConflictException('Serviço já vinculado ao profissional');
    }

    return this.prisma.professionalService.create({
      data,
    });
  }

  async update(
    professionalId: string,
    serviceId: string,
    data: UpdateProfessionalServiceDto,
    actor?: AuthPrincipal,
  ) {
    await this.assertCanManageProfessional(professionalId, actor);
    const record = await this.prisma.professionalService.findUnique({
      where: {
        professionalId_serviceId: { professionalId, serviceId },
      },
    });

    if (!record) {
      throw new BadRequestException('Vínculo não encontrado');
    }

    return this.prisma.professionalService.update({
      where: {
        professionalId_serviceId: { professionalId, serviceId },
      },
      data,
    });
  }

  async deactivate(
    professionalId: string,
    serviceId: string,
    actor?: AuthPrincipal,
  ) {
    await this.assertCanManageProfessional(professionalId, actor);
    return this.prisma.professionalService.update({
      where: {
        professionalId_serviceId: { professionalId, serviceId },
      },
      data: { active: false },
    });
  }

  private async assertCanManageProfessional(
    professionalId: string,
    actor?: AuthPrincipal,
  ) {
    if (!actor || hasRole(actor, UserRole.ADMIN)) return;

    const professional = await this.prisma.professional.findUnique({
      where: { id: professionalId },
      select: { userId: true },
    });

    if (
      !professional ||
      !hasRole(actor, UserRole.PROFESSIONAL) ||
      professional.userId !== actor.sub
    ) {
      throw new ForbiddenException(
        'Você não pode alterar os serviços deste profissional',
      );
    }
  }
}
