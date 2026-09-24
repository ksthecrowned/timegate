import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const ANOMALY_KINDS = ['ATTENDANCE_EVENT', 'PUNCH_CLAIM', 'TIMESHEET_DAY'] as const;
export type AnomalyKind = (typeof ANOMALY_KINDS)[number];

export const ANOMALY_STATUSES = ['OPEN', 'RESOLVED'] as const;
export type AnomalyStatus = (typeof ANOMALY_STATUSES)[number];

export class FindAnomaliesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(ANOMALY_STATUSES)
  status?: AnomalyStatus;

  @IsOptional()
  @IsIn(ANOMALY_KINDS)
  kind?: AnomalyKind;
}

export class ResolveAnomalyDto {
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
