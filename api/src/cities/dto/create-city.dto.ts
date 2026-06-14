import { IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCityDto {
  @IsString()
  @MinLength(1)
  @MaxLength(140)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(140)
  countryId!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
