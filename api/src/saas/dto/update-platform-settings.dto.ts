import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  trialDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  trialMaxEmployees?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  trialMaxKiosks?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;
}
