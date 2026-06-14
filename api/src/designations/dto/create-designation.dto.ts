import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDesignationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(140)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  grade?: string;
}
