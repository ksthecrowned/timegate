import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSelfLeaveDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  leaveTypeId?: string;
}
