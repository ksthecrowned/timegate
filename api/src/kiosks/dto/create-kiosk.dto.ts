import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateKioskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(140)
  name!: string;

  @IsString()
  @MaxLength(140)
  branchId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  shiftLocationId?: string;
}
