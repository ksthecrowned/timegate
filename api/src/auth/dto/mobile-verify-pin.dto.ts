import { IsDateString, IsOptional, IsString, Length, MaxLength } from 'class-validator';

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
}
