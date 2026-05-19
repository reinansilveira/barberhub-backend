import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleItemDto } from './dto/schedule-item.dto';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(professionalId?: string, active?: string) {
    return this.prisma.schedule.findMany({
      where: {
        professionalId: professionalId || undefined,
        active: active === 'false' ? false : true,
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });
  }

  async findById(id: string) {
    const schedule = await this.prisma.schedule.findUnique({ where: { id } });
    if (!schedule) throw new BadRequestException('Horário não encontrado');
    return schedule;
  }

  async create(dto: CreateScheduleDto) {
    const { professionalId, schedules } = dto;
    if (!schedules || schedules.length === 0)
      throw new BadRequestException('É necessário informar pelo menos um horário.');

    const ops = schedules.map((item) =>
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
    );

    return Promise.all(ops);
  }

  async update(id: string, item: ScheduleItemDto) {
    const existing = await this.prisma.schedule.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('Horário não encontrado');

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

  async desactivate(id: string) {
    return this.prisma.schedule.update({ where: { id }, data: { active: false } });
  }
}
