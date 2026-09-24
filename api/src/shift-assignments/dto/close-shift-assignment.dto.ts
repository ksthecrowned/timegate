import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CloseShiftAssignmentDto {
  /** Date de fin (défaut = aujourd’hui UTC date-only). */
  @IsOptional()
  @IsDateString()
  endDate?: string;

  /** Soft-end du contrat courant de l’employé (isCurrent=false). */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  endCurrentContract?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
