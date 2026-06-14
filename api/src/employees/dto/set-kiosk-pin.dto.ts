import { IsOptional, IsString, Length } from 'class-validator';

export class SetKioskPinDto {
  @IsOptional()
  @IsString()
  @Length(4, 6)
  pin?: string;
}
