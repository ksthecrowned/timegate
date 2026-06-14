import { KioskStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class KioskQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(KioskStatus)
  status?: KioskStatus;
}
