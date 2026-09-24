import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ArchiveLocationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
