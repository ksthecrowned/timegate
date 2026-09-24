import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Company size bands collected at self-signup. */
export const ORGANIZATION_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'] as const;
export type OrganizationSize = (typeof ORGANIZATION_SIZES)[number];

/** Contact job function at signup (not TimeGateUserRole). */
export const SIGNUP_CONTACT_ROLES = [
  'founder',
  'executive',
  'hr',
  'manager',
  'operations',
  'other',
] as const;
export type SignupContactRole = (typeof SIGNUP_CONTACT_ROLES)[number];

export const INDUSTRY_SECTORS = [
  'OFFICE',
  'TRAINING',
  'INDUSTRY',
  'SECURITY',
  'CLEANING',
  'STAFFING',
  'CLINIC',
  'HOTEL',
  'OTHER',
] as const;
export type IndustrySector = (typeof INDUSTRY_SECTORS)[number];

export const EXPECTED_SITE_COUNTS = ['1', '2-5', '6+'] as const;
export type ExpectedSiteCount = (typeof EXPECTED_SITE_COUNTS)[number];

export const WORKFORCE_MODELS = ['fixed_sites', 'client_sites', 'mixed'] as const;
export type WorkforceModel = (typeof WORKFORCE_MODELS)[number];

export const SCHEDULE_PATTERNS = ['fixed_day', 'multi_shift', 'includes_night'] as const;
export type SchedulePattern = (typeof SCHEDULE_PATTERNS)[number];

export const REFERRAL_SOURCES = [
  'salon',
  'word_of_mouth',
  'partner',
  'web',
  'OTHER',
] as const;
export type ReferralSource = (typeof REFERRAL_SOURCES)[number];

export class SignupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  organizationName!: string;

  @IsIn(ORGANIZATION_SIZES)
  organizationSize!: OrganizationSize;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  sku?: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  adminPassword!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  adminFirstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  adminLastName!: string;

  /** Fonction / poste du contact (ex. hr, founder). */
  @IsIn(SIGNUP_CONTACT_ROLES)
  contactRole!: SignupContactRole;

  @IsOptional()
  @IsIn(INDUSTRY_SECTORS)
  industrySector?: IndustrySector;

  @IsOptional()
  @IsIn(EXPECTED_SITE_COUNTS)
  expectedSiteCount?: ExpectedSiteCount;

  @IsOptional()
  @IsIn(WORKFORCE_MODELS)
  workforceModel?: WorkforceModel;

  @IsOptional()
  @IsIn(SCHEDULE_PATTERNS)
  schedulePattern?: SchedulePattern;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  countryCode?: string;

  @IsOptional()
  @IsIn(REFERRAL_SOURCES)
  referralSource?: ReferralSource;
}
