import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  @MinLength(1)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  language?: string;
}
