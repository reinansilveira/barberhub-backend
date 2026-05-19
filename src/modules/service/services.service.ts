import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateServicesDto } from './dto/create-services.dto';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class Services {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(active?: string) {
        return this.prisma.service.findMany({
            where: {
                active: active === 'false' ? false : true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: string, active?: string) {
        const service = await this.prisma.service.findFirst({
            where: {
                id,
                active: active === 'false' ? false : true,
            },
        });

        if (!service) {
            throw new NotFoundException('Serviço não encontrado');
        }

        return service;
    }

    async create(dto: CreateServicesDto) {
        return this.prisma.service.create({
            data: {
                ...dto,
                duration: dto.duration ?? 0,
            },
        });
    }

    async update(id: string, data: CreateServicesDto) {
        const service = await this.prisma.service.findUnique({
            where: { id },
        });

        if (!service) {
            throw new BadRequestException('Serviço não encontrado');
        }

        return this.prisma.service.update({
            where: { id },
            data: {
                ...data,
            },
        });
    }

    async desactivate(id: string) {
        return this.prisma.service.update({
            where: { id },
            data: { active: false },
        });
    }
}
