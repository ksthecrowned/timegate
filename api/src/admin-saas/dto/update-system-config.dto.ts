import { IsNumber, IsOptional, Max, Min } from 'class-validator';

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
}
