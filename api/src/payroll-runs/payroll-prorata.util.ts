import { AttendanceStatus } from '@prisma/client';
import { roundMoney } from '../common/utils/money.util';

/** Fallback only when the employee has no scheduled work days in the period. */
export const WORKING_DAYS_PER_MONTH_FALLBACK = 22;

/** Weight of one attendance day toward earned (paid) work for prorata réel. */
export function attendancePaidDayWeight(status: AttendanceStatus): number {
  switch (status) {
    case AttendanceStatus.HALF_DAY:
      return 0.5;
    case AttendanceStatus.PRESENT:
    case AttendanceStatus.WORK_FROM_HOME:
    case AttendanceStatus.ON_LEAVE:
    case AttendanceStatus.ON_HOLIDAY:
      return 1;
    case AttendanceStatus.ABSENT:
    default:
      return 0;
  }
}

/**
 * Paid weight for a calendar day. Approved leave overrides ABSENT / missing punch
 * (same spirit as skipping unjustified-absence penalties on leave days).
 */
export function paidWeightForDay(
  status: AttendanceStatus | null | undefined,
  onApprovedLeave: boolean,
): number {
  if (status != null) {
    const weight = attendancePaidDayWeight(status);
    if (weight === 0 && onApprovedLeave) return 1;
    return weight;
  }
  return onApprovedLeave ? 1 : 0;
}

export function sumPaidWorkDays(input: {
  attendanceByDate: Map<string, AttendanceStatus>;
  leaveCoveredDateKeys: Set<string>;
}): number {
  const keys = new Set<string>([
    ...input.attendanceByDate.keys(),
    ...input.leaveCoveredDateKeys,
  ]);
  let total = 0;
  for (const key of keys) {
    total += paidWeightForDay(
      input.attendanceByDate.get(key),
      input.leaveCoveredDateKeys.has(key),
    );
  }
  return total;
}

export type ProrataPayInput = {
  contractualBase: number;
  fixedAllowances: number;
  fixedDeductions: number;
  scheduledWorkDays: number;
  paidWorkDays: number;
};

export type ProrataPayResult = {
  workDaysDivisor: number;
  dailyRate: number;
  prorataRatio: number;
  baseSalary: number;
  fixedAllowancesTotal: number;
  fixedDeductionsTotal: number;
};

/**
 * Prorata réel : base & majorations fixes × (jours payés / jours prévus du mois).
 * Les absences non payées sont déjà reflétées via paidWorkDays (pas de retenue absences séparée).
 */
export function computeProrataPay(input: ProrataPayInput): ProrataPayResult {
  const workDaysDivisor =
    input.scheduledWorkDays > 0
      ? input.scheduledWorkDays
      : WORKING_DAYS_PER_MONTH_FALLBACK;
  const paid = Math.max(0, input.paidWorkDays);
  const prorataRatio = Math.min(1, paid / workDaysDivisor);
  const dailyRate =
    input.contractualBase > 0 ? input.contractualBase / workDaysDivisor : 0;

  return {
    workDaysDivisor,
    dailyRate: roundMoney(dailyRate),
    // Keep more precision than money rounding — ratio is a fraction of the month.
    prorataRatio: Number(prorataRatio.toFixed(6)),
    baseSalary: roundMoney(input.contractualBase * prorataRatio),
    fixedAllowancesTotal: roundMoney(input.fixedAllowances * prorataRatio),
    fixedDeductionsTotal: roundMoney(input.fixedDeductions * prorataRatio),
  };
}
