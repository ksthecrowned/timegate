import { IsDateString, IsString, MaxLength, MinLength, IsUUID } from 'class-validator';

export class CreateHolidayDto {
  @IsUUID()
  organizationId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsDateString()
  date!: string;
}
