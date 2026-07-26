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
}
