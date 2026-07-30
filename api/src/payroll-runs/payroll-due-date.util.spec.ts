import { describe, expect, test } from 'bun:test';
import { PayrollLinePaymentStatus } from '@prisma/client';
import {
  resolveEmployeePayDay,
  resolvePayDueDate,
} from './payroll-due-date.util';
import { sumPayrollLineTotals } from './payroll-run-totals.util';

describe('resolvePayDueDate', () => {
  test('returns UTC date-only for a normal month', () => {
    const date = resolvePayDueDate(2026, 6, 28);
    expect(date.toISOString()).toBe('2026-06-28T00:00:00.000Z');
  });

  test('clamps to last day of February in a non-leap year', () => {
    const date = resolvePayDueDate(2025, 2, 28);
    expect(date.toISOString()).toBe('2025-02-28T00:00:00.000Z');
  });

  test('clamps day 28 to Feb 28 in leap year', () => {
    const date = resolvePayDueDate(2024, 2, 28);
    expect(date.toISOString()).toBe('2024-02-28T00:00:00.000Z');
  });
});

describe('resolveEmployeePayDay', () => {
  test('prefers override over group day', () => {
    expect(resolveEmployeePayDay(15, 20)).toBe(20);
  });

  test('falls back to group day', () => {
    expect(resolveEmployeePayDay(15, null)).toBe(15);
  });

  test('returns null when neither is set', () => {
    expect(resolveEmployeePayDay(null, undefined)).toBeNull();
  });
});

describe('sumPayrollLineTotals', () => {
  test('sums money fields and counts payment status', () => {
    const totals = sumPayrollLineTotals([
      {
        baseSalary: 1000,
        fixedAllowancesTotal: 50,
        fixedDeductionsTotal: 10,
        variableAllowancesTotal: 20,
        variableDeductionsTotal: 5,
        overtimeAmount: 100,
        penaltyAmount: 15,
        gross: 1170,
        netSalary: 1140,
        paymentStatus: PayrollLinePaymentStatus.PAID,
      },
      {
        baseSalary: 2000.005,
        gross: 2000.005,
        netSalary: 1999.995,
        paymentStatus: PayrollLinePaymentStatus.UNPAID,
      },
    ]);

    expect(totals.totalBaseSalary).toBe(3000.01);
    expect(totals.totalGross).toBe(3170.01);
    expect(totals.totalNet).toBe(3139.99);
    expect(totals.linesCount).toBe(2);
    expect(totals.paidCount).toBe(1);
    expect(totals.unpaidCount).toBe(1);
  });
});
