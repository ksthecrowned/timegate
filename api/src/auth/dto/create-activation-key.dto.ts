import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateActivationKeyDto {
  @IsString()
  plan!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxEmployees!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxDevices!: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
