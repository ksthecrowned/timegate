import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TimeGateLocationType } from '@prisma/client';

export class CreateLocationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(140)
  name!: string;

  @IsOptional()
  @IsEnum(TimeGateLocationType)
  type?: TimeGateLocationType;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  branchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  timeZone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  clientLabel?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  checkinRadius?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
