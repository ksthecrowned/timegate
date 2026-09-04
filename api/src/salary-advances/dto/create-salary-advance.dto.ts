import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateSalaryAdvanceDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  /** If true, create already DISBURSED with paidAt = now. */
  @IsOptional()
  @IsBoolean()
  disbursed?: boolean;
}
