import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateLateRecordDto {
  @IsString()
  @MaxLength(140)
  employeeId!: string;

  @IsDateString()
  date!: string;

  @IsInt()
  @Min(1)
  latenessMinutes!: number;

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
