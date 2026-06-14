import { TimeGateTimesheetDayStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindTimesheetsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TimeGateTimesheetDayStatus)
  status?: TimeGateTimesheetDayStatus;
}
