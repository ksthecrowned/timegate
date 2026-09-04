import { describe, expect, test } from 'bun:test';
import { AttendanceStatus } from '@prisma/client';
import {
  attendancePaidDayWeight,
  computeProrataPay,
  paidWeightForDay,
  sumPaidWorkDays,
} from './payroll-prorata.util';

describe('attendancePaidDayWeight', () => {
  test('counts full paid statuses as 1', () => {
    expect(attendancePaidDayWeight(AttendanceStatus.PRESENT)).toBe(1);
    expect(attendancePaidDayWeight(AttendanceStatus.WORK_FROM_HOME)).toBe(1);
    expect(attendancePaidDayWeight(AttendanceStatus.ON_LEAVE)).toBe(1);
    expect(attendancePaidDayWeight(AttendanceStatus.ON_HOLIDAY)).toBe(1);
  });

  test('counts half-day as 0.5 and absent as 0', () => {
    expect(attendancePaidDayWeight(AttendanceStatus.HALF_DAY)).toBe(0.5);
    expect(attendancePaidDayWeight(AttendanceStatus.ABSENT)).toBe(0);
  });
});

describe('paidWeightForDay', () => {
  test('approved leave overrides absent or missing attendance', () => {
    expect(paidWeightForDay(AttendanceStatus.ABSENT, true)).toBe(1);
    expect(paidWeightForDay(null, true)).toBe(1);
  });

  test('keeps half-day weight when not on leave', () => {
    expect(paidWeightForDay(AttendanceStatus.HALF_DAY, false)).toBe(0.5);
  });
});

describe('sumPaidWorkDays', () => {
  test('sums attendance weights and leave-only days without double counting', () => {
    const attendanceByDate = new Map<string, AttendanceStatus>([
      ['2026-09-01', AttendanceStatus.PRESENT],
      ['2026-09-02', AttendanceStatus.HALF_DAY],
      ['2026-09-03', AttendanceStatus.ABSENT],
    ]);
    const leaveCoveredDateKeys = new Set(['2026-09-03', '2026-09-04']);

    // 1 (present) + 0.5 (half) + 1 (absent overridden by leave) + 1 (leave-only) = 3.5
    expect(sumPaidWorkDays({ attendanceByDate, leaveCoveredDateKeys })).toBe(3.5);
  });
});

describe('computeProrataPay', () => {
  test('prorates base and fixed items by paid / scheduled days', () => {
    const result = computeProrataPay({
      contractualBase: 440_000,
      fixedAllowances: 22_000,
      fixedDeductions: 11_000,
      scheduledWorkDays: 22,
      paidWorkDays: 2,
    });

    expect(result.workDaysDivisor).toBe(22);
    expect(result.prorataRatio).toBeCloseTo(2 / 22, 5);
    expect(result.baseSalary).toBe(40_000);
    expect(result.fixedAllowancesTotal).toBe(2_000);
    expect(result.fixedDeductionsTotal).toBe(1_000);
    expect(result.dailyRate).toBe(20_000);
  });

  test('caps ratio at 1 when paid days exceed scheduled', () => {
    const result = computeProrataPay({
      contractualBase: 100_000,
      fixedAllowances: 0,
      fixedDeductions: 0,
      scheduledWorkDays: 20,
      paidWorkDays: 25,
    });
    expect(result.prorataRatio).toBe(1);
    expect(result.baseSalary).toBe(100_000);
  });

  test('uses 22-day fallback divisor when no scheduled days', () => {
    const result = computeProrataPay({
      contractualBase: 220_000,
      fixedAllowances: 0,
      fixedDeductions: 0,
      scheduledWorkDays: 0,
      paidWorkDays: 11,
    });
    expect(result.workDaysDivisor).toBe(22);
    expect(result.baseSalary).toBe(110_000);
  });

  test('yields zero pay when nothing was worked yet', () => {
    const result = computeProrataPay({
      contractualBase: 420_000,
      fixedAllowances: 25_000,
      fixedDeductions: 5_000,
      scheduledWorkDays: 22,
      paidWorkDays: 0,
    });
    expect(result.baseSalary).toBe(0);
    expect(result.fixedAllowancesTotal).toBe(0);
    expect(result.fixedDeductionsTotal).toBe(0);
  });
});
