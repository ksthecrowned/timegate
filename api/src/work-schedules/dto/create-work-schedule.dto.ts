import { IsDateString, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateWorkScheduleDto {
  @IsUUID()
  siteId!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  lateGraceMinutes?: number;
}
