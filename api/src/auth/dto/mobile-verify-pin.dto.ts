import { IsDateString, IsLatitude, IsLongitude, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class MobileVerifyPinDto {
  @IsString()
  @MaxLength(140)
  employeeId!: string;

  @IsString()
  @Length(4, 6)
  pin!: string;

  @IsOptional()
  @IsDateString()
  capturedAt?: string;

  /** Flag sync offline (`"1"`) — PIN offline est rejeté métier après validation. */
  @IsOptional()
  @IsString()
  @MaxLength(8)
  offlineSync?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
