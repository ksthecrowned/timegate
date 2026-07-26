import { IsBoolean, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator'

export class UpdateScheduleDayExceptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  shiftTypeId?: string

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  workDate?: string

  @IsOptional()
  @IsBoolean()
  isOff?: boolean

  @IsOptional()
  @ValidateIf((o: UpdateScheduleDayExceptionDto) => o.isOff !== true)
  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/)
  startTime?: string | null

  @IsOptional()
  @ValidateIf((o: UpdateScheduleDayExceptionDto) => o.isOff !== true)
  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/)
  endTime?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string | null
}
