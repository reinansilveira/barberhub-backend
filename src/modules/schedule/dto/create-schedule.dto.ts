import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduleItemDto } from './schedule-item.dto';

export class CreateScheduleDto {
  @ApiProperty({ example: 'uuid-do-professional' })
  @IsString()
  @IsNotEmpty()
  professionalId: string;

  @ApiProperty({ type: [ScheduleItemDto] })
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  schedules: ScheduleItemDto[];
}
