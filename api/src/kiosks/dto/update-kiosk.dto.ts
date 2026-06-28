import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateKioskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(140)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  branchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  shiftLocationId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  faceEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  nfcEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  qrEnabled?: boolean;
}
