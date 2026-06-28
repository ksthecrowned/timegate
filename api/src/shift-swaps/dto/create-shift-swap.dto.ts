import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateShiftSwapDto {
  @IsString()
  @MaxLength(140)
  requesterEmployeeId!: string;

  @IsString()
  @MaxLength(140)
  targetEmployeeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  shiftAssignmentId?: string;

  @IsDateString()
  swapDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
