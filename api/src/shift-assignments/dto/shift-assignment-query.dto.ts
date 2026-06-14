import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ShiftAssignmentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  shiftTypeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  shiftLocationId?: string;
}
