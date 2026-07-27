import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
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
}
