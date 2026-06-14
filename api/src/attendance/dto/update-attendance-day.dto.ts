import { AttendanceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAttendanceDayDto {
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  leaveTypeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  shiftId?: string;
}
