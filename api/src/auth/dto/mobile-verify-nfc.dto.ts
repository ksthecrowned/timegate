import { IsDateString, IsLatitude, IsLongitude, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class MobileVerifyNfcDto {
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  badgeUid!: string;

  @IsOptional()
  @IsDateString()
  capturedAt?: string;

  /** Flag sync offline (`"1"`) — lu aussi via @Body('offlineSync'). */
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
