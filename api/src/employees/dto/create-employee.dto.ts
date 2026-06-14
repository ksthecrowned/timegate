import { Prisma } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastName!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsappPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  nationality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  cityId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  countryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  province?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nationalIdNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  passportNumber?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  branchId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  defaultShiftId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  departmentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  designationId?: string;

  /** Liste fériés Frappe (`HolidayList`) ; sinon liste company par défaut. */
  @IsOptional()
  @IsString()
  @MaxLength(140)
  holidayListId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  faceEmbedding?: Prisma.InputJsonValue;
}
