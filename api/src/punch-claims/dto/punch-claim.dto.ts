import { TimeGatePunchClaimStatus, TimeGatePunchClaimType } from '@prisma/client';
import { IsDateString, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CreatePunchClaimDto {
  @IsDateString()
  workDate!: string;

  @IsEnum(TimeGatePunchClaimType)
  type!: TimeGatePunchClaimType;

  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class FindPunchClaimsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(TimeGatePunchClaimStatus)
  status?: TimeGatePunchClaimStatus;

  @IsOptional()
  @IsString()
  employeeId?: string;
}

export class ReviewPunchClaimDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNote?: string;
}
