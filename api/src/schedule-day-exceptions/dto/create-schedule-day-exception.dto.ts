import { IsBoolean, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator'

export class CreateScheduleDayExceptionDto {
  @IsString()
  @MaxLength(140)
  shiftTypeId!: string

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  workDate!: string

  @IsOptional()
  @IsBoolean()
  isOff?: boolean

  @ValidateIf((o: CreateScheduleDayExceptionDto) => !o.isOff)
  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/)
  startTime?: string

  @ValidateIf((o: CreateScheduleDayExceptionDto) => !o.isOff)
  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/)
  endTime?: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string
}
