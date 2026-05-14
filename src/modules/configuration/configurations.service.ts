import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateConfigurationDto } from './dto/create-configuration.dto';

@Injectable()
export class ConfigurationsService {
    constructor(private readonly prisma: PrismaService) {}

    findAll() {
        return this.prisma.configuration.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    create(data: CreateConfigurationDto) {
        return this.prisma.configuration.create({ data });
    }

    update(key: string, data: CreateConfigurationDto) {
        return this.prisma.configuration.update({
            where: { key },
            data,
        });
    }
}