import { KioskStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class KioskHeartbeatDto {
  @IsOptional()
  @IsEnum(KioskStatus)
  status?: KioskStatus;
}
