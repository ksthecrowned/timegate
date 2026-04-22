import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class MobileProvisionDto {
  @IsOptional()
  @IsUUID()
  deviceId?: string;

  @IsOptional()
  @IsUUID()
  siteId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  deviceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
}

