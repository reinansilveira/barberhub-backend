import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateSlotDto } from './dto/create-slot.dto';

export type SlotResult = { id: string; startsAt: Date };

export type SlotBatchResult = {
  created: SlotResult[];
  skipped: { startsAt: string; reason: string }[];
};

@Injectable()
export class SlotsService {
  constructor(private readonly prisma: PrismaService) {}

  public async create(dto: CreateSlotDto): Promise<SlotResult | SlotBatchResult> {
    if (!dto.startsAt && !dto.slots) {
      throw new BadRequestException('Informe [startsAt] ou [slots].');
    }

    const times = dto.slots ?? [dto.startsAt!];

    return times.length === 1
      ? this.createOne(dto.professionalId, times[0])
      : this.createMany(dto.professionalId, times);
  }

  public async findAvailable(professionalId: string, date: string): Promise<SlotResult[]> {
    const start = new Date(`${date}T00:00:00`);
    const end   = new Date(`${date}T23:59:59`);

    return this.prisma.timeSlot.findMany({
      where: {
        professionalId,
        available: true,
        startsAt: { gte: start, lte: end },
      },
      orderBy: { startsAt: 'asc' },
      select: { id: true, startsAt: true },
    });
  }

  public async delete(id: string): Promise<void> {
    const slot = await this.prisma.timeSlot.findUnique({ where: { id } });

    if (!slot)           throw new NotFoundException('Slot não encontrado');
    if (!slot.available) throw new BadRequestException('Slot já está ocupado');

    await this.prisma.timeSlot.delete({ where: { id } });
  }


  private async createOne(professionalId: string, rawStartsAt: string): Promise<SlotResult> {
    const startsAt  = new Date(rawStartsAt);
    const dayOfWeek = startsAt.getDay();

    const schedule = await this.prisma.schedule.findFirst({
      where: {
        professionalId,
        active: true,
        OR: [
          { dayOfWeek, date: null },
          { date: startsAt },
        ],
      },
    });

    if (!schedule) throw new BadRequestException('Profissional não trabalha neste dia');

    const existing = await this.prisma.timeSlot.findUnique({
      where: { professionalId_startsAt: { professionalId, startsAt } },
    });

    if (existing) throw new ConflictException('Slot já existe neste horário');

    return this.prisma.timeSlot.create({
      data: { professionalId, startsAt },
      select: { id: true, startsAt: true },
    });
  }

  private async createMany(professionalId: string, times: string[]): Promise<SlotBatchResult> {
    const created: SlotResult[] = [];
    const skipped: { startsAt: string; reason: string }[] = [];

    for (const startsAt of times) {
      try {
        const result = await this.createOne(professionalId, startsAt);
        created.push(result);
      } catch (err) {
        const reason = err instanceof HttpException
          ? err.message
          : 'Erro desconhecido';

        skipped.push({ startsAt, reason });
      }
    }

    return { created, skipped };
  }
}