import { PayrollLinePaymentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class FindPayrollLinesQueryDto {
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
