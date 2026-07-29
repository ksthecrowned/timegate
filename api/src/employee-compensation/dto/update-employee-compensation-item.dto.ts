import {
  IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';
import { CompensationItemKind } from '@prisma/client';

export class UpdateEmployeeCompensationItemDto {
  @IsString() @IsOptional() label?: string;
  @IsEnum(CompensationItemKind) @IsOptional() kind?: CompensationItemKind;
  @IsNumber() @Min(0) @IsOptional() amount?: number;
  @IsBoolean() @IsOptional() isRecurring?: boolean;
  @IsBoolean() @IsOptional() isActive?: boolean;
  @IsDateString() @IsOptional() effectiveFrom?: string;
  @IsDateString() @IsOptional() effectiveTo?: string;
}
