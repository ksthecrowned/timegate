import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateDeviceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsUUID()
  siteId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
}
