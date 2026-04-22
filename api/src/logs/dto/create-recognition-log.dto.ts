import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Max, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRecognitionLogDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsUUID()
  deviceId!: string;

  @IsBoolean()
  success!: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;
}
