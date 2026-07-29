import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CompensationItemKind } from '@prisma/client';

export class CreatePayrollVariableItemDto {
  @IsString() @IsNotEmpty() employeeId: string;
  @IsString() @IsNotEmpty() label: string;
  @IsEnum(CompensationItemKind) kind: CompensationItemKind;
  @IsNumber() @Min(0) amount: number;
  @IsString() @IsOptional() notes?: string;
}
