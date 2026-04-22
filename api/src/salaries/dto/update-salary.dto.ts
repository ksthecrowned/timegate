import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { SalaryStatus } from '@prisma/client';
import { CreateSalaryDto } from './create-salary.dto';

export class UpdateSalaryDto extends PartialType(CreateSalaryDto) {
  @IsOptional()
  @IsEnum(SalaryStatus)
  status?: SalaryStatus;

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
