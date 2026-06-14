import { SetMetadata } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: TimeGateUserRole[]) => SetMetadata(ROLES_KEY, roles);
