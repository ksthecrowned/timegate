import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CityQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  countryId?: string;
}
