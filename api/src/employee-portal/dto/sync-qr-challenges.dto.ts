import { Type } from 'class-transformer';
import { IsArray, IsISO8601, IsString, MinLength, ValidateNested } from 'class-validator';

export class SyncQrChallengeItemDto {
  @IsString()
  @MinLength(1)
  clientId!: string;

  @IsString()
  @MinLength(10)
  payload!: string;

  @IsISO8601()
  scannedAt!: string;
}

export class SyncQrChallengesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncQrChallengeItemDto)
  items!: SyncQrChallengeItemDto[];
}
