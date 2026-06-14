import { TimeGatePayrollRunStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindPayrollRunsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TimeGatePayrollRunStatus)
  status?: TimeGatePayrollRunStatus;

  @IsOptional()
  @IsInt()
  @Min(2000)
  year?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;
}
