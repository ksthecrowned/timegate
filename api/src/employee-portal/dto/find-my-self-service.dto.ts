import { TimeGateTimesheetDayStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindMyTimesheetsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TimeGateTimesheetDayStatus)
  status?: TimeGateTimesheetDayStatus;
}

export class FindColleaguesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  q?: string;
}
