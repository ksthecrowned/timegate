import { ForbiddenException } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { describe, expect, mock, test } from 'bun:test';
import type { JwtUser } from '../common/decorators/current-user.decorator';
import { AiToolRegistry } from './ai-tool.registry';

const PAYROLL_TOOL_NAMES = [
  'get_payroll_mass',
  'get_payroll_payment_status',
  'get_payroll_due_alerts',
  'list_payroll_runs',
  'compare_payroll_months',
  'get_payroll_by_branch',
  'get_pay_groups',
  'get_employee_compensation',
  'get_upcoming_pay_dues',
];

const admin: JwtUser = {
  sub: 'admin-1',
  email: 'admin@example.com',
  kind: 'user',
  role: TimeGateUserRole.ADMIN,
  companyId: 'company-1',
};

const manager: JwtUser = {
  ...admin,
  sub: 'manager-1',
  role: TimeGateUserRole.MANAGER,
};

function createRegistry(lines: unknown[] = []) {
  const prisma = {
    timeGatePayrollLine: {
      findMany: mock(async () => lines),
    },
  };
  const registry = new AiToolRegistry(
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { prisma, registry };
}

describe('AiToolRegistry payroll access', () => {
  test('exposes payroll tools only to ADMIN and rejects MANAGER execution', async () => {
    const { registry } = createRegistry();

    const managerNames = registry.getDefinitions(manager).map((definition) => definition.name);
    const adminNames = registry.getDefinitions(admin).map((definition) => definition.name);

    expect(managerNames.filter((name) => PAYROLL_TOOL_NAMES.includes(name))).toEqual([]);
    expect(adminNames.filter((name) => PAYROLL_TOOL_NAMES.includes(name))).toEqual(PAYROLL_TOOL_NAMES);
    await expect(registry.execute('get_payroll_mass', {}, manager)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('AiToolRegistry payroll due alerts', () => {
  test('queries due-soon and overdue payroll lines separately', async () => {
    const { prisma, registry } = createRegistry();

    await registry.execute('get_payroll_due_alerts', {}, admin);

    expect(prisma.timeGatePayrollLine.findMany).toHaveBeenCalledTimes(2);
  });
});
