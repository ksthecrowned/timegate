import { AttendanceStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsNotEmpty, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ExportAttendanceDaysQueryDto extends PaginationQueryDto {
  @IsDateString()
  @IsNotEmpty()
  from!: string;

  @IsDateString()
  @IsNotEmpty()
  to!: string;

  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsIn(['csv', 'pdf'])
  format?: 'csv' | 'pdf';
}
