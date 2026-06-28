import { IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class SetNfcBadgeDto {
  @IsOptional()
  @ValidateIf((_o, v) => v != null && v !== '')
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  badgeUid?: string | null;
}
