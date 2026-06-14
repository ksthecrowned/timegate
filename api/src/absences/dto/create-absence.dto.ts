import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAbsenceDto {
  @IsString()
  @MaxLength(140)
  employeeId!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsBoolean()
  justified?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  justificationFileUrl?: string;
}
