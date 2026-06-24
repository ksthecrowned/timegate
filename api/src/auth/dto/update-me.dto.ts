import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  lastName?: string;
}
