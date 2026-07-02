import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

/** Legacy dashboard status values (maps to LeaveApplicationStatus). */
export enum LegacyLeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class CreateLeaveDto {
  @IsString()
  @MaxLength(140)
  employeeId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsEnum(LegacyLeaveStatus)
  status?: LegacyLeaveStatus;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  leaveTypeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  supportDocumentUrl?: string;
}
