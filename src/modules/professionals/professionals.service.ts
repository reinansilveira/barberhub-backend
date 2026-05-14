import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateProfessionalDto } from './dto/create-profissional.dto';

@Injectable()
export class ProfessionalService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(active?: string) {
    return this.prisma.professional.findMany({
      where: { active: active === 'false' ? false : true },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  }

  async findById(id: string, active?: string) {
    const professional = await this.prisma.professional.findUnique({
      where: { id },
      include: { user: true },
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

    return this.prisma.professional.create({
      data: {
        userId: data.userId,
        specialty: data.specialty,
        bio: data.bio,
        experience: data.experience,
        commission: data.commission,
      },
      include: { user: true },
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
      include: { user: true },
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