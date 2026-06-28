import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

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
}
