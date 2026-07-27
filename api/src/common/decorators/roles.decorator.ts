import { SetMetadata } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import type { PlatformAdminRole } from '../constants/platform-admin';

export type AppRole = TimeGateUserRole | PlatformAdminRole;

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
