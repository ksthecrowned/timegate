import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class PlanningCalendarQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  branchId?: string;
}
