import { IsEnum, IsOptional } from 'class-validator';
import { TimeGateShiftSwapStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ShiftSwapQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TimeGateShiftSwapStatus)
  status?: TimeGateShiftSwapStatus;
}
