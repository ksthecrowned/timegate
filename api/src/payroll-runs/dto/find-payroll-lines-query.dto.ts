import { PayrollLinePaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Not extending the shared PaginationQueryDto: payroll runs are typically small
 * enough (per-company headcount) that the dashboard fetches the full line set in
 * one page, so the limit ceiling here is intentionally higher than the standard 100.
 */
export class FindPayrollLinesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 1000;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  branchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  payGroupId?: string;

  @IsOptional()
  @IsEnum(PayrollLinePaymentStatus)
  paymentStatus?: PayrollLinePaymentStatus;

  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @IsOptional()
  @IsDateString()
  dueTo?: string;
}
