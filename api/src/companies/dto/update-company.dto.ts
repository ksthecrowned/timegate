import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  EXPECTED_SITE_COUNTS,
  INDUSTRY_SECTORS,
  REFERRAL_SOURCES,
  SCHEDULE_PATTERNS,
  WORKFORCE_MODELS,
} from '../../auth/dto/signup.dto';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  abbr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  timeZone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(140)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsIn(INDUSTRY_SECTORS)
  industrySector?: (typeof INDUSTRY_SECTORS)[number] | null;

  @IsOptional()
  @IsIn(EXPECTED_SITE_COUNTS)
  expectedSiteCount?: (typeof EXPECTED_SITE_COUNTS)[number] | null;

  @IsOptional()
  @IsIn(WORKFORCE_MODELS)
  workforceModel?: (typeof WORKFORCE_MODELS)[number] | null;

  @IsOptional()
  @IsIn(SCHEDULE_PATTERNS)
  schedulePattern?: (typeof SCHEDULE_PATTERNS)[number] | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  countryCode?: string | null;

  @IsOptional()
  @IsIn(REFERRAL_SOURCES)
  referralSource?: (typeof REFERRAL_SOURCES)[number] | null;
}
