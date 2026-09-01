import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleItemDto } from './dto/schedule-item.dto';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  private async findScheduleOrThrow(id: string) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id },
    });

    if (!schedule) {
      throw new BadRequestException('Horário não encontrado');
    }

    return schedule;
  }

  public async findAll(professionalId?: string, active?: boolean) {
    return this.prisma.schedule.findMany({
      where: {
        ...(professionalId && { professionalId }),
        ...(active !== undefined && { active }),
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  public async findById(id: string) {
    return this.findScheduleOrThrow(id);
  }

  public async create(dto: CreateScheduleDto) {
    const { professionalId, schedules } = dto;

    if (!schedules || schedules.length === 0) {
      throw new BadRequestException(
        'É necessário informar pelo menos um horário.',
      );
    }

    return this.prisma.$transaction(
      schedules.map((item) =>
        this.prisma.schedule.create({
          data: {
            professionalId,
            dayOfWeek: item.dayOfWeek ?? null,
            date: item.date ? new Date(item.date) : null,
            startTime: item.startTime,
            endTime: item.endTime,
            breakStart: item.breakStart ?? null,
            breakEnd: item.breakEnd ?? null,
            active: true,
          },
        }),
      ),
    );
  }

  public async update(id: string, item: ScheduleItemDto) {
    const existing = await this.findScheduleOrThrow(id);

    return this.prisma.schedule.update({
      where: { id },
      data: {
        dayOfWeek: item.dayOfWeek ?? existing.dayOfWeek ?? null,
        date: item.date ? new Date(item.date) : existing.date ?? null,
        startTime: item.startTime,
        endTime: item.endTime,
        breakStart: item.breakStart ?? existing.breakStart ?? null,
        breakEnd: item.breakEnd ?? existing.breakEnd ?? null,
      },
    });
  }

  public async deactivate(id: string) {
    await this.findScheduleOrThrow(id);

    return this.prisma.schedule.update({
      where: { id },
      data: { active: false },
    });
  }
}
