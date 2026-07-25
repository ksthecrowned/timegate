import { IsString, MinLength } from 'class-validator';

export class ScanQrChallengeDto {
  @IsString()
  @MinLength(10)
  payload!: string;
}
