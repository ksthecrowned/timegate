import { describe, expect, mock, test } from 'bun:test';
import { EmployeeStatus, TimeGateUserRole } from '@prisma/client';
import { dateToMinutesInTimeZone } from '../common/utils/punch-time.util';
import { ManagerService } from './manager.service';
import { ManagerTeamTodayQueryDto } from './dto/manager-query.dto';

function buildService(shiftStartMin: number, shiftEndMin?: number) {
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
    company: { findUnique: mock(async () => ({ timeZone: 'Africa/Brazzaville' })) },
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
      shiftEndMin: shiftEndMin ?? (shiftStartMin + 8 * 60) % (24 * 60),
    })),
  } as any;

  return new ManagerService(prisma, holidayCalendar, attendance, punchWindows);
}

function currentMinutes(): number {
  return dateToMinutesInTimeZone(new Date(), 'Africa/Brazzaville');
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
    // Fixed early-morning window; expected status depends on wall clock.
    const start = 60; // 01:00
    const end = 120; // 02:00
    const service = buildService(start, end);
    const result = await service.teamToday(new ManagerTeamTodayQueryDto(), MANAGER_USER);
    const expected =
      now < start ? 'EXPECTED' : now < end ? 'LATE' : 'ABSENT';
    expect(result.members[0]?.status).toBe(expected);
  });

  test('returns PRESENT when checked in even if timesheet has lateMinutes', async () => {
    const employee = {
      id: 'EMP-1',
      firstName: 'Katherine',
      lastName: 'Johnson',
      employeeName: null,
      branchId: 'BR-1',
      holidayListId: null,
      branch: { id: 'BR-1', branchName: 'Pointe-Noire' },
      department: { id: 'DEP-1', departmentName: 'Finance' },
      status: EmployeeStatus.ACTIVE,
    };
    const now = new Date();
    const prisma = {
      company: { findUnique: mock(async () => ({ timeZone: 'Africa/Brazzaville' })) },
      employee: { findMany: mock(async () => [employee]) },
      leaveApplication: { findMany: mock(async () => []) },
      timeGateAttendanceEvent: {
        findMany: mock(async () => [
          {
            employeeId: 'EMP-1',
            type: 'CHECK_IN',
            status: 'ACCEPTED',
            occurredAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
          },
          {
            employeeId: 'EMP-1',
            type: 'CHECK_OUT',
            status: 'ACCEPTED',
            occurredAt: now,
          },
        ]),
      },
      timeGateTimesheetDay: {
        findMany: mock(async () => [
          {
            employeeId: 'EMP-1',
            status: 'OPEN',
            lateMinutes: 20,
            workedMinutes: 460,
            workDate: new Date(),
            updatedAt: now,
            anomalyFlags: null,
          },
        ]),
      },
    } as any;

    const service = new ManagerService(
      prisma,
      { buildIndexForEmployees: mock(async () => new Map()) } as any,
      {} as any,
      {
        resolveForEmployee: mock(async () => ({
          shiftStartMin: 9 * 60,
          shiftEndMin: 17 * 60,
        })),
      } as any,
    );

    const result = await service.teamToday(new ManagerTeamTodayQueryDto(), MANAGER_USER);
    expect(result.members[0]?.status).toBe('PRESENT');
    expect(result.members[0]?.lateMinutes).toBe(20);
    expect(result.members[0]?.workedMinutes).toBe(460);
  });
});

