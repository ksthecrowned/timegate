import { PartialType } from '@nestjs/mapped-types';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  /** Per-employee override of the pay group's due day (1-28); pass null to clear. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  payDueDayOverride?: number | null;
}
