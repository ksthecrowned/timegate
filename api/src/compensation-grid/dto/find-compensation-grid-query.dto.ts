import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindCompensationGridQueryDto extends PaginationQueryDto {
  @IsString() @IsOptional() designationId?: string;
  @IsString() @IsOptional() employmentTypeId?: string;
}
