import { describe, expect, mock, test } from 'bun:test';
import {
  PayrollLinePaymentStatus,
  TimeGateNotificationType,
  TimeGatePayrollRunStatus,
} from '@prisma/client';
import { NotificationsService } from './notifications.service';

const now = new Date('2026-07-10T12:00:00.000Z');

function createService(lines: unknown[]) {
  const prisma = {
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

    expect(prisma.timeGatePayrollLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          paymentStatus: PayrollLinePaymentStatus.UNPAID,
          payrollRun: { status: { not: TimeGatePayrollRunStatus.DRAFT } },
        }),
      }),
    );
    expect(service.emit).toHaveBeenCalledTimes(2);
    expect(service.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: ['ADMIN-1'],
        type: TimeGateNotificationType.PAYROLL_DUE_SOON,
        dedupeKey: 'payroll-due-alert:PAYROLL_DUE_SOON:LINE-DUE-SOON:2026-07-10',
      }),
    );
    expect(service.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: ['ADMIN-1'],
        type: TimeGateNotificationType.PAYROLL_OVERDUE,
        dedupeKey: 'payroll-due-alert:PAYROLL_OVERDUE:LINE-OVERDUE:2026-07-10',
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
        dedupeKey: 'payroll-due-alert:PAYROLL_DUE_SOON:LINE-DUE-TOMORROW:2026-07-10',
      }),
    );
  });
});
