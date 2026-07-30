import { describe, expect, mock, test } from 'bun:test';
import { EmployeeStatus, TimeGateUserRole } from '@prisma/client';
import { ManagerService } from './manager.service';
import { ManagerTeamTodayQueryDto } from './dto/manager-query.dto';

function buildService(shiftStartMin: number) {
  const employee = {
    id: 'EMP-1',
    firstName: 'Patrick',
    lastName: 'Test',
    employeeName: null,
    branchId: 'BR-1',
    holidayListId: null,
    branch: { id: 'BR-1', branchName: 'Brazzaville' },
    department: { id: 'DEP-1', departmentName: 'Ops' },
    status: EmployeeStatus.ACTIVE,
  };

  const prisma = {
    employee: { findMany: mock(async () => [employee]) },
    leaveApplication: { findMany: mock(async () => []) },
    timeGateAttendanceEvent: { findMany: mock(async () => []) },
    timeGateTimesheetDay: { findMany: mock(async () => []) },
  } as any;

  const holidayCalendar = {
    buildIndexForEmployees: mock(async () => new Map()),
  } as any;

  const attendance = {} as any;

  const punchWindows = {
    resolveForEmployee: mock(async () => ({
      shiftStartMin,
      shiftEndMin: (shiftStartMin + 8 * 60) % (24 * 60),
    })),
  } as any;

  return new ManagerService(prisma, holidayCalendar, attendance, punchWindows);
}

function currentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

const MANAGER_USER = {
  role: TimeGateUserRole.MANAGER,
  companyId: 'CMP-1',
} as any;

describe('ManagerService teamToday status boundaries', () => {
  test('returns EXPECTED before shift start when no check-in exists', async () => {
    const service = buildService(currentMinutes() + 30);
    const result = await service.teamToday(new ManagerTeamTodayQueryDto(), MANAGER_USER);
    expect(result.members[0]?.status).toBe('EXPECTED');
  });

  test('returns LATE after shift start when no check-in exists', async () => {
    const service = buildService(Math.max(0, currentMinutes() - 30));
    const result = await service.teamToday(new ManagerTeamTodayQueryDto(), MANAGER_USER);
    expect(result.members[0]?.status).toBe('LATE');
  });

  test('returns ABSENT after shift end when no check-in exists', async () => {
    const now = currentMinutes();
    const service = buildService(Math.max(0, now - 9 * 60));
    const result = await service.teamToday(new ManagerTeamTodayQueryDto(), MANAGER_USER);
    expect(result.members[0]?.status).toBe('ABSENT');
  });
});

