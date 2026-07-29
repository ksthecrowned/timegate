import {
  IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';
import { CompensationItemKind } from '@prisma/client';

export class CreateEmployeeCompensationItemDto {
  @IsString() @IsNotEmpty() label: string;
  @IsEnum(CompensationItemKind) kind: CompensationItemKind;
  @IsNumber() @Min(0) amount: number;
  @IsBoolean() @IsOptional() isRecurring?: boolean;
  @IsDateString() effectiveFrom: string;
  @IsDateString() @IsOptional() effectiveTo?: string;
}
