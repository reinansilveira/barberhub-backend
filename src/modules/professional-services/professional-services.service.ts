import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateProfessionalServiceDto } from './dto/create-professional-service.dto';
import { UpdateProfessionalServiceDto } from './dto/update-professional-service.dto';

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

  async create(data: CreateProfessionalServiceDto) {
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
  ) {
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

  async desactivate(professionalId: string, serviceId: string) {
    return this.prisma.professionalService.update({
      where: {
        professionalId_serviceId: { professionalId, serviceId },
      },
      data: { active: false },
    });
  }
}