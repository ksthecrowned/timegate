import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

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
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => SyncQrChallengeItemDto)
  items!: SyncQrChallengeItemDto[];
}
