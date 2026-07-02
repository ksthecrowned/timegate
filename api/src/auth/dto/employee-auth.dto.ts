import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TimeGateDevicePlatform } from '@prisma/client';

export class EmployeeIdentifyDto {
  @IsEmail()
  email!: string;
}

export class EmployeeLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  deviceInstallId!: string;

  @IsEnum(TimeGateDevicePlatform)
  platform!: TimeGateDevicePlatform;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  deviceLabel?: string;
}
