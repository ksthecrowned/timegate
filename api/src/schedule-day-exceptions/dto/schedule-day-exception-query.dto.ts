import { IsOptional, IsString, Matches, MaxLength } from 'class-validator'
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto'

export class ScheduleDayExceptionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  shiftTypeId?: string

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string
}
