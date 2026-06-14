import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class OverrideTimesheetDto {
  @IsInt()
  @Min(0)
  workedMinutes!: number;

  @IsInt()
  @Min(0)
  lateMinutes!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  breakMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  overtimeMinutes?: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
