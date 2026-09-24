import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class EndEmployeeContractDto {
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
