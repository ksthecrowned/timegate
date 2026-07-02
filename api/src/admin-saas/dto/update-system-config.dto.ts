import { IsInt, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateSystemConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minConfidence?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lateThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  veryLateThreshold?: number;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  defaultShiftTypeId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  pinFailureThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  pinFailureCooldownSeconds?: number;

  /** 0 = désactivé, 5 ou 15 minutes */
  @IsOptional()
  @IsIn([0, 5, 15])
  timesheetRoundingMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60)
  overtimeAlertThresholdMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60)
  minMinutesBetweenShifts?: number;
}
