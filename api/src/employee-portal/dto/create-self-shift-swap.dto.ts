import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSelfShiftSwapDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  shiftAssignmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  targetEmployeeId?: string;

  @IsDateString()
  swapDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
