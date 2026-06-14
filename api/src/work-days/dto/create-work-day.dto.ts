import { WeekDay } from '@prisma/client';
import { IsEnum, IsString, Matches, MaxLength } from 'class-validator';

export class CreateWorkDayDto {
  @IsString()
  @MaxLength(140)
  scheduleId!: string;

  @IsEnum(WeekDay)
  day!: WeekDay;

  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/)
  startTime!: string;

  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/)
  endTime!: string;
}
