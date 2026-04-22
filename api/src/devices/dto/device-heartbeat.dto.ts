import { IsEnum, IsOptional } from 'class-validator';
import { DeviceStatus } from '@prisma/client';

export class DeviceHeartbeatDto {
  @IsOptional()
  @IsEnum(DeviceStatus)
  status?: DeviceStatus;
}
