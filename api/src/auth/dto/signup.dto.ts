import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  organizationName!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  sku?: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  adminPassword!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  adminFirstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  adminLastName?: string;
}
