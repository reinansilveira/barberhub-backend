import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleItemDto } from './dto/schedule-item.dto';
import {
  AuthPrincipal,
  hasRole,
} from '../auth/types/auth-principal.type';

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
      throw new ForbiddenException('Você não pode alterar esta agenda');
    }
  }

  private validateItem(item: ScheduleItemDto) {
    const hasDate = Boolean(item.date);
    const hasWeekday = item.dayOfWeek !== undefined;

    if (hasDate === hasWeekday) {
      throw new BadRequestException(
        'Informe uma data específica ou um dia da semana, mas não ambos.',
      );
    }

    if (item.startTime >= item.endTime) {
      throw new BadRequestException('O horário de início deve ser antes do fim.');
    }

    const hasBreakStart = Boolean(item.breakStart);
    const hasBreakEnd = Boolean(item.breakEnd);
    if (hasBreakStart !== hasBreakEnd) {
      throw new BadRequestException('Informe início e fim do intervalo.');
    }

    if (
      item.breakStart &&
      item.breakEnd &&
      (item.breakStart >= item.breakEnd ||
        item.breakStart <= item.startTime ||
        item.breakEnd >= item.endTime)
    ) {
      throw new BadRequestException('O intervalo deve estar dentro do expediente.');
    }
  }

  public async findAll(
    professionalId?: string,
    active = true,
    actor?: AuthPrincipal,
  ) {
    if (professionalId) {
      await this.assertCanManageProfessional(professionalId, actor);
    } else if (!actor || !hasRole(actor, UserRole.ADMIN)) {
      throw new ForbiddenException('Selecione um profissional da sua agenda');
    }

    return this.prisma.schedule.findMany({
      where: {
        professionalId: professionalId || undefined,
        active,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  public async findById(id: string, actor?: AuthPrincipal) {
    const schedule = await this.findScheduleOrThrow(id);
    await this.assertCanManageProfessional(schedule.professionalId, actor);
    return schedule;
  }

  public async create(dto: CreateScheduleDto, actor?: AuthPrincipal) {
    const { professionalId, schedules } = dto;

    if (!schedules || schedules.length === 0) {
      throw new BadRequestException(
        'É necessário informar pelo menos um horário.',
      );
    }

    await this.assertCanManageProfessional(dto.professionalId, actor);
    dto.schedules.forEach((item) => this.validateItem(item));

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

  public async update(id: string, item: ScheduleItemDto, actor?: AuthPrincipal) {
    const existing = await this.findScheduleOrThrow(id);
    await this.assertCanManageProfessional(existing.professionalId, actor);

    const hasDate = Boolean(item.date);
    const hasWeekday = item.dayOfWeek !== undefined;
    const nextItem: ScheduleItemDto = {
      dayOfWeek: hasDate
        ? undefined
        : hasWeekday
          ? item.dayOfWeek
          : existing.dayOfWeek ?? undefined,
      date: hasWeekday
        ? undefined
        : hasDate
          ? item.date
          : existing.date?.toISOString().slice(0, 10),
      startTime: item.startTime,
      endTime: item.endTime,
      breakStart: item.breakStart ?? existing.breakStart ?? undefined,
      breakEnd: item.breakEnd ?? existing.breakEnd ?? undefined,
    };
    this.validateItem(nextItem);

    return this.prisma.schedule.update({
      where: { id },
      data: {
        dayOfWeek: nextItem.dayOfWeek ?? null,
        date: nextItem.date ? new Date(`${nextItem.date}T00:00:00.000Z`) : null,
        startTime: nextItem.startTime,
        endTime: nextItem.endTime,
        breakStart: nextItem.breakStart ?? null,
        breakEnd: nextItem.breakEnd ?? null,
      },
    });
  }

  public async deactivate(id: string, actor?: AuthPrincipal) {
    const schedule = await this.findScheduleOrThrow(id);
    await this.assertCanManageProfessional(schedule.professionalId, actor);

    return this.prisma.schedule.update({
      where: { id },
      data: { active: false },
    });
  }
}
