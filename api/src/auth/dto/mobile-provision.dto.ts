import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class MobileProvisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  kioskId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  branchId?: string;

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
