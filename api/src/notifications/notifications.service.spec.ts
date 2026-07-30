import { describe, expect, mock, test } from 'bun:test';
import {
  TimeGateNotificationType,
  TimeGatePayrollRunStatus,
} from '@prisma/client';
import { NotificationsService } from './notifications.service';

/** 08:00 UTC so localHour === 8 for company timeZone UTC. */
const now = new Date('2026-07-10T08:00:00.000Z');

function createService(lines: unknown[]) {
  const prisma = {
    company: {
      findMany: mock(async () => [{ id: 'COMPANY-1', timeZone: 'UTC' }]),
    },
    timeGatePayrollLine: {
      findMany: mock(async () => lines),
    },
    user: {
      findMany: mock(async () => [{ id: 'ADMIN-1' }]),
    },
  };
  const service = new NotificationsService(prisma as never, {} as never, {} as never, {} as never, {} as never);
  service.emit = mock(async () => 1);
  return { prisma, service };
}

describe('notifyPayrollDueAlerts', () => {
  test('emits due-soon and overdue alerts only for eligible unpaid payroll lines', async () => {
    const { prisma, service } = createService([
      {
        id: 'LINE-DUE-SOON',
        companyId: 'COMPANY-1',
        employeeId: 'EMP-1',
        dueDate: new Date('2026-07-13T00:00:00.000Z'),
        employee: { employeeName: 'Alice Doe', firstName: null, lastName: null },
        payrollRun: { id: 'RUN-1', status: TimeGatePayrollRunStatus.LOCKED },
      },
      {
        id: 'LINE-OVERDUE',
        companyId: 'COMPANY-1',
        employeeId: 'EMP-2',
        dueDate: new Date('2026-07-09T00:00:00.000Z'),
        employee: { employeeName: 'Bob Doe', firstName: null, lastName: null },
        payrollRun: { id: 'RUN-1', status: TimeGatePayrollRunStatus.LOCKED },
      },
    ]);

    await service.notifyPayrollDueAlerts(now);

    expect(prisma.company.findMany).toHaveBeenCalled();
    expect(prisma.timeGatePayrollLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'COMPANY-1',
          paymentStatus: 'UNPAID',
          payrollRun: { status: { not: 'DRAFT' } },
        }),
      }),
    );
    expect(service.emit).toHaveBeenCalledTimes(2);
    expect(service.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: ['ADMIN-1'],
        type: TimeGateNotificationType.PAYROLL_DUE_SOON,
        dedupeKey: 'payroll-due-alert:COMPANY-1:PAYROLL_DUE_SOON:LINE-DUE-SOON:2026-07-10',
      }),
    );
    expect(service.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: ['ADMIN-1'],
        type: TimeGateNotificationType.PAYROLL_OVERDUE,
        dedupeKey: 'payroll-due-alert:COMPANY-1:PAYROLL_OVERDUE:LINE-OVERDUE:2026-07-10',
      }),
    );
  });

  test('emits a due-soon alert one day before the due date', async () => {
    const { service } = createService([
      {
        id: 'LINE-DUE-TOMORROW',
        companyId: 'COMPANY-1',
        employeeId: 'EMP-1',
        dueDate: new Date('2026-07-11T00:00:00.000Z'),
        employee: { employeeName: 'Alice Doe', firstName: null, lastName: null },
        payrollRun: { id: 'RUN-1', status: TimeGatePayrollRunStatus.LOCKED },
      },
    ]);

    await service.notifyPayrollDueAlerts(now);

    expect(service.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: TimeGateNotificationType.PAYROLL_DUE_SOON,
        dedupeKey: 'payroll-due-alert:COMPANY-1:PAYROLL_DUE_SOON:LINE-DUE-TOMORROW:2026-07-10',
      }),
    );
  });

  test('does not re-emit overdue alerts for lines overdue by more than one day', async () => {
    const { prisma, service } = createService([]);

    await service.notifyPayrollDueAlerts(now);

    // J+1 spec: only the day right after the due date should ever query/alert as overdue,
    // so a line overdue by e.g. 5 days must fall outside the query window entirely.
    expect(prisma.timeGatePayrollLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          dueDate: expect.objectContaining({
            gte: new Date('2026-07-09T00:00:00.000Z'),
            lte: new Date('2026-07-13T00:00:00.000Z'),
          }),
        }),
      }),
    );
    expect(service.emit).not.toHaveBeenCalled();
  });

  test('does not emit an overdue alert for a line overdue by more than one day', async () => {
    const { service } = createService([
      {
        id: 'LINE-LONG-OVERDUE',
        companyId: 'COMPANY-1',
        employeeId: 'EMP-3',
        dueDate: new Date('2026-07-05T00:00:00.000Z'),
        employee: { employeeName: 'Carl Doe', firstName: null, lastName: null },
        payrollRun: { id: 'RUN-1', status: TimeGatePayrollRunStatus.LOCKED },
      },
    ]);

    await service.notifyPayrollDueAlerts(now);

    expect(service.emit).not.toHaveBeenCalled();
  });

  test('skips companies outside local 08:00 window', async () => {
    const { prisma, service } = createService([
      {
        id: 'LINE-DUE-SOON',
        companyId: 'COMPANY-1',
        employeeId: 'EMP-1',
        dueDate: new Date('2026-07-13T00:00:00.000Z'),
        employee: { employeeName: 'Alice Doe', firstName: null, lastName: null },
        payrollRun: { id: 'RUN-1', status: TimeGatePayrollRunStatus.LOCKED },
      },
    ]);

    await service.notifyPayrollDueAlerts(new Date('2026-07-10T12:00:00.000Z'));

    expect(prisma.timeGatePayrollLine.findMany).not.toHaveBeenCalled();
    expect(service.emit).not.toHaveBeenCalled();
  });
});
