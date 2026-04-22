import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateEmployeeContractDto {
  @IsDateString()
  signedAt!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  renewalsCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
