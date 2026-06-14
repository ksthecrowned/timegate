import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CheckinLogType } from '@prisma/client';

/** Legacy CHECK_IN / CHECK_OUT — mapped to EmployeeCheckin logType. */
export enum LegacyAttendanceType {
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
}

export class CreateAttendanceDto {
  @IsString()
  @MaxLength(140)
  employeeId!: string;

  @IsString()
  @MaxLength(140)
  kioskId!: string;

  @IsEnum(LegacyAttendanceType)
  type!: LegacyAttendanceType;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number;

  @IsOptional()
  @IsDateString()
  timestamp?: string;
}

export function toCheckinLogType(type: LegacyAttendanceType): CheckinLogType {
  return type === LegacyAttendanceType.CHECK_IN ? CheckinLogType.IN : CheckinLogType.OUT;
}
