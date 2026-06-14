import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TimeGateUserRole } from '@prisma/client';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(TimeGateUserRole)
  role!: TimeGateUserRole;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  companyId?: string;
}
