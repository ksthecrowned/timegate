import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateWorkScheduleDto {
  @IsString()
  @MaxLength(140)
  branchId!: string;

  @IsString()
  @MaxLength(140)
  name!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  lateGraceMinutes?: number;
}
