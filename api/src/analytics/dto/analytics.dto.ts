import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const EVENT_RE = /^[a-z][a-z0-9._]{1,62}$/;

export class TrackAnalyticsEventDto {
  @IsString()
  @Matches(EVENT_RE)
  event!: string;

  @IsOptional()
  @IsString()
  @IsIn(['ios', 'android', 'web'])
  platform?: 'ios' | 'android' | 'web';
}

export class AnalyticsFunnelQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number;
}
