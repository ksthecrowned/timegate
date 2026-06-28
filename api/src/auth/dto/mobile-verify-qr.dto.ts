import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class MobileVerifyQrDto {
  @IsString()
  @MinLength(8)
  @MaxLength(512)
  qrPayload!: string;

  @IsOptional()
  @IsDateString()
  capturedAt?: string;
}
