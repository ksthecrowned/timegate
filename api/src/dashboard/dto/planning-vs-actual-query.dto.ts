import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PlanningVsActualQueryDto {
  @IsDateString()
  @IsNotEmpty()
  from!: string;

  @IsDateString()
  @IsNotEmpty()
  to!: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}
