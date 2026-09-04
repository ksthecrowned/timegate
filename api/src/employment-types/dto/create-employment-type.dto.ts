import { EmploymentPayMode } from '@prisma/client'
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateEmploymentTypeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(140)
  name!: string

  @IsOptional()
  @IsBoolean()
  includeInPayroll?: boolean

  @IsOptional()
  @IsBoolean()
  accruesLeave?: boolean

  @IsOptional()
  @IsEnum(EmploymentPayMode)
  payMode?: EmploymentPayMode
}
