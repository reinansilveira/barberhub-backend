import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  HttpException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import {
  AuthPrincipal,
  hasRole,
} from '../auth/types/auth-principal.type';

export type SlotResult = { id: string; startsAt: Date };

export type SlotBatchResult = {
  created: SlotResult[];
  skipped: { startsAt: string; reason: string }[];
};

@Injectable()
export class SlotsService {
  constructor(private readonly prisma: PrismaService) {}

  public async create(
    dto: CreateSlotDto,
    actor?: AuthPrincipal,
  ): Promise<SlotResult | SlotBatchResult> {
    if (!dto.startsAt && !dto.slots) {
      throw new BadRequestException('Informe [startsAt] ou [slots].');
    }

    await this.assertCanManageProfessional(dto.professionalId, actor);
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

  public async delete(id: string, actor?: AuthPrincipal): Promise<void> {
    const slot = await this.prisma.timeSlot.findUnique({ where: { id } });

    if (!slot)           throw new NotFoundException('Slot não encontrado');
    if (!slot.available) throw new BadRequestException('Slot já está ocupado');
    await this.assertCanManageProfessional(slot.professionalId, actor);

    await this.prisma.timeSlot.delete({ where: { id } });
  }


  private async createOne(professionalId: string, rawStartsAt: string): Promise<SlotResult> {
    const startsAt  = new Date(rawStartsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('Horário inválido');
    }

    const business = this.businessTime(startsAt);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        professionalId,
        active: true,
        OR: [
          { dayOfWeek: business.dayOfWeek, date: null },
          { date: { gte: business.dayStart, lt: business.dayEnd } },
        ],
      },
    });

    const schedule = schedules.find((item) =>
      this.isWithinSchedule(business.time, item),
    );

    if (!schedule) {
      throw new BadRequestException(
        'Horário fora do expediente ou intervalo do profissional',
      );
    }

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
      throw new ForbiddenException('Você não pode alterar os slots deste profissional');
    }
  }

  private businessTime(startsAt: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(startsAt);
    const value = (type: string) =>
      parts.find((part) => part.type === type)?.value ?? '';
    const date = `${value('year')}-${value('month')}-${value('day')}`;

    return {
      dayOfWeek: new Date(`${date}T12:00:00.000Z`).getUTCDay(),
      time: `${value('hour')}:${value('minute')}`,
      dayStart: new Date(`${date}T00:00:00.000Z`),
      dayEnd: new Date(
        new Date(`${date}T00:00:00.000Z`).getTime() + 86_400_000,
      ),
    } as const;
  }

  private isWithinSchedule(
    time: string,
    schedule: {
      startTime: string;
      endTime: string;
      breakStart: string | null;
      breakEnd: string | null;
    },
  ) {
    const inWorkHours = time >= schedule.startTime && time < schedule.endTime;
    const inBreak =
      schedule.breakStart &&
      schedule.breakEnd &&
      time >= schedule.breakStart &&
      time < schedule.breakEnd;
    return inWorkHours && !inBreak;
  }
}
