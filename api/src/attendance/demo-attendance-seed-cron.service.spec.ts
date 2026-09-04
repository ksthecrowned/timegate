import { describe, expect, mock, test } from 'bun:test';
import { EmployeeStatus } from '@prisma/client';
import { DemoAttendanceSeedCronService } from './demo-attendance-seed-cron.service';

describe('DemoAttendanceSeedCronService', () => {
  test('skips when attendance events already exist today', async () => {
    const prisma = {
      timeGateAttendanceEvent: {
        count: mock(async () => 3),
        upsert: mock(async () => ({})),
      },
      employee: { findMany: mock(async () => []) },
      leaveApplication: { findMany: mock(async () => []) },
      timeGateKiosk: { findMany: mock(async () => []) },
      timeGateTimesheetDay: {
        findUnique: mock(async () => null),
        create: mock(async () => ({})),
        update: mock(async () => ({})),
      },
    } as any;

    const service = new DemoAttendanceSeedCronService(
      prisma,
      { resolveForEmployee: mock(async () => null) } as any,
      { buildIndexForEmployees: mock(async () => new Map()) } as any,
    );

    const result = await service.seedCompanyDay(
      'CMP-1',
      'Africa/Brazzaville',
      new Date('2026-09-04T12:00:00.000Z'),
    );

    expect(result.skipped).toBe(true);
    expect(result.reason).toContain('already today');
    expect(prisma.timeGateAttendanceEvent.upsert).not.toHaveBeenCalled();
  });

  test('seeds present punches when day is empty', async () => {
    const upserts: unknown[] = [];
    const prisma = {
      timeGateAttendanceEvent: {
        count: mock(async () => 0),
        upsert: mock(async (args: unknown) => {
          upserts.push(args);
          return {};
        }),
      },
      employee: {
        findMany: mock(async () => [
          {
            id: 'EMP-A',
            branchId: 'BR-1',
            holidayListId: null,
            companyId: 'CMP-1',
            status: EmployeeStatus.ACTIVE,
          },
          {
            id: 'EMP-B',
            branchId: 'BR-1',
            holidayListId: null,
            companyId: 'CMP-1',
            status: EmployeeStatus.ACTIVE,
          },
          {
            id: 'EMP-C',
            branchId: 'BR-1',
            holidayListId: null,
            companyId: 'CMP-1',
            status: EmployeeStatus.ACTIVE,
          },
          {
            id: 'EMP-D',
            branchId: 'BR-1',
            holidayListId: null,
            companyId: 'CMP-1',
            status: EmployeeStatus.ACTIVE,
          },
          {
            id: 'EMP-E',
            branchId: 'BR-1',
            holidayListId: null,
            companyId: 'CMP-1',
            status: EmployeeStatus.ACTIVE,
          },
        ]),
      },
      leaveApplication: { findMany: mock(async () => []) },
      timeGateKiosk: {
        findMany: mock(async () => [{ id: 'KSK-1', branchId: 'BR-1' }]),
      },
      timeGateTimesheetDay: {
        findUnique: mock(async () => null),
        create: mock(async () => ({})),
        update: mock(async () => ({})),
      },
    } as any;

    const service = new DemoAttendanceSeedCronService(
      prisma,
      {
        resolveForEmployee: mock(async () => ({
          shiftStartMin: 8 * 60,
          shiftEndMin: 17 * 60,
          breakDurationMinutes: 60,
        })),
      } as any,
      { buildIndexForEmployees: mock(async () => new Map()) } as any,
    );

    // Afternoon so check-outs can be created
    const result = await service.seedCompanyDay(
      'CMP-1',
      'Africa/Brazzaville',
      new Date('2026-09-04T15:00:00.000Z'),
    );

    expect(result.skipped).toBe(false);
    expect(result.present + result.absentLeft).toBe(5);
    expect(result.present).toBeGreaterThan(0);
    expect(upserts.length).toBeGreaterThan(0);
  });
});
