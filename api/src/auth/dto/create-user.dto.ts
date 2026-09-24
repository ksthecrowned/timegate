import { IsEmail, IsIn, IsOptional, IsString, MinLength, IsArray, ArrayMaxSize, MaxLength } from 'class-validator';
import { TimeGateUserRole } from '@prisma/client';

/** Roles a tenant ADMIN may assign when creating organization Users. */
export const ORGANIZATION_ASSIGNABLE_ROLES = [
  TimeGateUserRole.ADMIN,
  TimeGateUserRole.MANAGER,
  TimeGateUserRole.EMPLOYEE,
] as const;

export type OrganizationAssignableRole = (typeof ORGANIZATION_ASSIGNABLE_ROLES)[number];

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn([...ORGANIZATION_ASSIGNABLE_ROLES])
  role!: OrganizationAssignableRole;

  /** Lieux de périmètre (managers) — capacité `scoped_managers`. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(140, { each: true })
  locationIds?: string[];
}
