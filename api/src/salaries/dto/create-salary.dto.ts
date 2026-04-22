import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateSalaryDto {
  @IsUUID()
  employeeId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(3000)
  year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseSalary!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bonuses?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  deductions?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
