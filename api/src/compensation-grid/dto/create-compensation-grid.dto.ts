import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCompensationGridDto {
  @IsString() @IsNotEmpty() designationId: string;
  @IsString() @IsNotEmpty() employmentTypeId: string;
  @IsNumber() @Min(0) baseSalary: number;
  @IsDateString() effectiveFrom: string;
  @IsDateString() @IsOptional() effectiveTo?: string;
}
