import { ForbiddenException } from '@nestjs/common';
import { JwtUser } from '../decorators/current-user.decorator';

export function requireCompanyId(user?: JwtUser): string {
  const companyId = user?.companyId;
  if (!companyId) {
    throw new ForbiddenException('Company context is required');
  }
  return companyId;
}
