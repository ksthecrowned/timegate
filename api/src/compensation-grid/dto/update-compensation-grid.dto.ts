import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCompensationGridDto {
  @IsString() @IsOptional() designationId?: string;
  @IsString() @IsOptional() employmentTypeId?: string;
  @IsNumber() @Min(0) @IsOptional() baseSalary?: number;
  @IsDateString() @IsOptional() effectiveFrom?: string;
  @IsDateString() @IsOptional() effectiveTo?: string;
}
