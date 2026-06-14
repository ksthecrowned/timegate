import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCountryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(140)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(10)
  isoCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneCode?: string;
}
