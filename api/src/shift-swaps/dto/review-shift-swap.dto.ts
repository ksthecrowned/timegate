import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TimeGateShiftSwapStatus } from '@prisma/client';

export class ReviewShiftSwapDto {
  @IsEnum(TimeGateShiftSwapStatus)
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNote?: string;
}
