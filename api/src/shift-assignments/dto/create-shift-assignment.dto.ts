import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateShiftAssignmentDto {
  @IsString()
  @MaxLength(140)
  employeeId!: string;

  @IsString()
  @MaxLength(140)
  shiftTypeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  shiftLocationId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
