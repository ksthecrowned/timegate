import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class SyncRecordsDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  employeeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  branchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  companyId?: string;
}
