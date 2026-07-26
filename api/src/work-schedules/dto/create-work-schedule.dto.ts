import { WeekDay } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PunchWindowFieldsDto } from './punch-window-fields.dto';

export class ShiftWeekDayInputDto {
  @IsEnum(WeekDay)
  day!: WeekDay;

  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/)
  startTime!: string;

  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/)
  endTime!: string;
}

export class CreateWorkScheduleDto extends PunchWindowFieldsDto {
  @IsString()
  @MaxLength(140)
  branchId!: string;

  @IsString()
  @MaxLength(140)
  name!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  lateGraceMinutes?: number;

  /** Jours travaillés de cet horaire (requis pour le pointage / planning). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => ShiftWeekDayInputDto)
  weekDays?: ShiftWeekDayInputDto[];
}
