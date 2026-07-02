import { IsDateString, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ManagerTeamTodayQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}

export class ManagerInboxQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
