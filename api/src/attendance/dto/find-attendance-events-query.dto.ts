import { TimeGateAttendanceEventStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindAttendanceEventsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TimeGateAttendanceEventStatus)
  status?: TimeGateAttendanceEventStatus;
}
