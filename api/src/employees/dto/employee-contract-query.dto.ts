import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const EMPLOYEE_CONTRACT_STATUS_FILTERS = [
  'current',
  'expiring',
  'expired',
  'past',
] as const;

export type EmployeeContractStatusFilter = (typeof EMPLOYEE_CONTRACT_STATUS_FILTERS)[number];

export class EmployeeContractQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  employeeId?: string;

  /** current | expiring (≤30 j) | expired | past (non courant) */
  @IsOptional()
  @IsIn(EMPLOYEE_CONTRACT_STATUS_FILTERS)
  status?: EmployeeContractStatusFilter;
}
