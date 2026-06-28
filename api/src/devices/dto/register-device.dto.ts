import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { TimeGateDevicePlatform } from '@prisma/client';

export class RegisterDeviceDto {
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  token!: string;

  @IsEnum(TimeGateDevicePlatform)
  platform!: TimeGateDevicePlatform;
}

export class RemoveDeviceDto {
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  token!: string;
}
