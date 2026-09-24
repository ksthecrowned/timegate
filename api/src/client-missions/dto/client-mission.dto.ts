import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const CLIENT_MISSION_STATUSES = ['DRAFT', 'ACTIVE', 'CLOSED'] as const;

export class FindClientMissionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(CLIENT_MISSION_STATUSES)
  status?: (typeof CLIENT_MISSION_STATUSES)[number];
}

export class CreateClientMissionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(140)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  locationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  clientLabel?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  branchId?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE'])
  status?: 'DRAFT' | 'ACTIVE';
}

export class UpdateClientMissionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(140)
  title?: string;

  @IsOptional()
  @IsIn(CLIENT_MISSION_STATUSES)
  status?: (typeof CLIENT_MISSION_STATUSES)[number];

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;
}
