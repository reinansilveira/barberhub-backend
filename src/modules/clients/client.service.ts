import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { ClientCreateMapper } from './mappers/client-create.mapper';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) { }

  private generateTempPassword(length = 10): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const all = upper + lower + digits;

    const pick = (set: string) => set[crypto.randomInt(set.length)];

    return (
      pick(upper) +
      pick(lower) +
      pick(digits) +
      Array.from({ length: length - 3 }, () => pick(all)).join('')
    );
  }

  public async ensureCredentials(
    clientId: string,
  ): Promise<{ plainPassword: string | null }> {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!client) {
      throw new BadRequestException('Cliente não encontrado');
    }

    if (client.password) {
      return { plainPassword: null };
    }

    const plainPassword = this.generateTempPassword();
    const hashed = await bcrypt.hash(plainPassword, 10);

    await this.prisma.client.update({
      where: { id: clientId },
      data: {
        password: hashed,
        passwordSetAt: new Date(),
        mustChangePassword: true,
      },
    });

    return { plainPassword };
  }

  public async findByPhone(phone: string) {
    return this.prisma.client.findUnique({
      where: { phone },
    });
  }

  public async getDashboard(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        mustChangePassword: true,
      },
    });

    if (!client) {
      throw new BadRequestException('Cliente não encontrado');
    }

    const appointments = await this.prisma.appointment.findMany({
      where: { clientId },
      orderBy: { scheduledAt: 'desc' },
      include: {
        professional: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            },
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true
          }
        },
      },
    });

    return { client, appointments };
  }

  // public async findAll(active?: string) {
  //   return this.prisma.client.findMany({
  //     where: {
  //       active: active === 'false' ? false : true,
  //     },
  //     orderBy: {
  //       createdAt: 'desc',
  //     },
  //   });
  // }

  public async findById(id: string, active?: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        id,
        active: active === 'false' ? false : true,
      },
    });
    return client ? ClientCreateMapper.toResponse(client) : null;
  }

  public async create(data: CreateClientDto) {
    const existingClient = await this.prisma.client.findFirst({
      where: { phone: data.phone },
    });

    if (existingClient) {
      throw new ConflictException({
        message: 'Telefone já cadastrado',
        clientId: existingClient.id,
      });
    }

    const client = await this.prisma.client.create({
      data: { ...data, phoneVerifiedAt: null },
    });

    return ClientCreateMapper.toResponse(client);
  }

  public async update(id: string, data: CreateClientDto) {
    const existingClient = await this.prisma.client.findUnique({
      where: {
        id,
      },
    });

    if (!existingClient) {
      throw new BadRequestException('Cliente não encontrado');
    }

    const client = await this.prisma.client.update({
      where: {
        id,
      },
      data,
    });
    return ClientCreateMapper.toResponse(client);
  }

  public async updateAvatar(id: string, data: { avatar: string }) {
    const existingClient = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!existingClient) {
      throw new BadRequestException('Cliente não encontrado');
    }

    const client = await this.prisma.client.update({
      where: { id },
      data: { avatar: data.avatar },
    });

    return ClientCreateMapper.toResponse(client);
  }

  public async desactivate(id: string) {
    const client = await this.prisma.client.update({
      where: {
        id,
      },
      data: {
        active: false,
        reengagementSentAt: null,
      },
    });
    return ClientCreateMapper.toResponse(client);
  }


}
