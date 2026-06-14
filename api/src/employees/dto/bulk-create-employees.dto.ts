import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Prisma } from '@prisma/client';

/** Ligne CSV : validation souple pour permettre le succès partiel ligne par ligne. */
export class BulkEmployeeRowDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  lastName?: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(140)
  branchId?: string;

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

export class BulkCreateEmployeesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => BulkEmployeeRowDto)
  employees!: BulkEmployeeRowDto[];
}

export class BulkImportRowError {
  row!: number;
  message!: string;
}

export class BulkImportResultDto {
  created!: number;
  failed!: number;
  employees!: Array<{ row: number; id: string; firstName: string; lastName: string }>;
  errors!: BulkImportRowError[];
}
