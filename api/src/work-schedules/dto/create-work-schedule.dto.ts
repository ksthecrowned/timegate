import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PunchWindowFieldsDto } from './punch-window-fields.dto';

export class CreateWorkScheduleDto extends PunchWindowFieldsDto {
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
