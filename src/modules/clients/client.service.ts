import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ClientCreateMapper } from './mappers/client-create.mapper';

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) { }

  // public async findAll(active?: string) {
  //   return this.prisma.client.findMany({
  //     where: {
  //       active: active === 'false' ? false : true,
  //     },
  //     orderBy: { createdAt: 'desc' },
  //   });
  // }

  public async findById(id: string, active?: string) {
    return this.prisma.client.findFirst({
      where: {
        id,
        active: active === 'false' ? false : true,
      },
    });
  }

  public async create(data: CreateClientDto) {
    const existingClient = await this.prisma.client.findFirst({
      where: { phone: data.phone },
    });

    if (existingClient) {
      throw new ConflictException('Telefone já cadastrado');
    }

    const client = await this.prisma.client.create({
      data: { ...data, phoneVerifiedAt: null },
    });

    return ClientCreateMapper.toResponse(client);
  }

  public async update(id: string, data: CreateClientDto) {
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new BadRequestException('Cliente não encontrado');
    }

    return this.prisma.client.update({
      where: { id },
      data,
    });
  }

  public async desactivate(id: string) {
    return this.prisma.client.update({
      where: { id },
      data:
      {
        active: false,
        reengagementSentAt: null
      },

    });
  }
}
