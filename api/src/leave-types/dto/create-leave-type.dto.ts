import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateLeaveTypeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(140)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isLwp?: boolean;

  @IsOptional()
  @IsBoolean()
  isCarryForward?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(366)
  maxDaysPerYear?: number | null;
}
