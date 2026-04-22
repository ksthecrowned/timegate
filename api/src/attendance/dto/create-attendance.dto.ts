import { Type } from 'class-transformer';
import { AttendanceType } from '@prisma/client';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateAttendanceDto {
  @IsUUID()
  employeeId!: string;

  @IsUUID()
  deviceId!: string;

  @IsEnum(AttendanceType)
  type!: AttendanceType;

  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;
}
