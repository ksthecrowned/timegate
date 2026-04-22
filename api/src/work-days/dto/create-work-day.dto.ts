import { WeekDay } from '@prisma/client';
import { IsEnum, IsString, IsUUID, Matches } from 'class-validator';

export class CreateWorkDayDto {
  @IsUUID()
  scheduleId!: string;

  @IsEnum(WeekDay)
  day!: WeekDay;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime!: string;
}
