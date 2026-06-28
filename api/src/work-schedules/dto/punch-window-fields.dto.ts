import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

/** Champs fenêtres de pointage (Lot B) — optionnels, defaults calculés côté serveur si absents. */
export class PunchWindowFieldsDto {
  @IsOptional()
  @IsString()
  checkInWindowStart?: string;

  @IsOptional()
  @IsString()
  checkInWindowEnd?: string;

  @IsOptional()
  @IsString()
  checkOutWindowStart?: string;

  @IsOptional()
  @IsString()
  checkOutWindowEnd?: string;

  @IsOptional()
  @IsString()
  breakWindowStart?: string;

  @IsOptional()
  @IsString()
  breakWindowEnd?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  breakDurationMinutes?: number;
}
