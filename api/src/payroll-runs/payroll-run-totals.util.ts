import { PayrollLinePaymentStatus, Prisma } from '@prisma/client';
import { fromDecimal, roundMoney } from '../common/utils/money.util';

export type PayrollLineTotalsInput = {
  baseSalary?: number | Prisma.Decimal | null;
  fixedAllowancesTotal?: number | Prisma.Decimal | null;
  fixedDeductionsTotal?: number | Prisma.Decimal | null;
  variableAllowancesTotal?: number | Prisma.Decimal | null;
  variableDeductionsTotal?: number | Prisma.Decimal | null;
  overtimeAmount?: number | Prisma.Decimal | null;
  penaltyAmount?: number | Prisma.Decimal | null;
  gross?: number | Prisma.Decimal | null;
  netSalary?: number | Prisma.Decimal | null;
  paymentStatus: PayrollLinePaymentStatus;
};

export type PayrollRunTotals = {
  totalBaseSalary: number;
  totalFixedAllowances: number;
  totalFixedDeductions: number;
  totalVariableAllowances: number;
  totalVariableDeductions: number;
  totalOvertime: number;
  totalPenalties: number;
  totalGross: number;
  totalNet: number;
  linesCount: number;
  paidCount: number;
  unpaidCount: number;
};

function money(value: number | Prisma.Decimal | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === 'number') return roundMoney(value);
  return fromDecimal(value);
}

export function sumPayrollLineTotals(
  lines: PayrollLineTotalsInput[],
): PayrollRunTotals {
  let totalBaseSalary = 0;
  let totalFixedAllowances = 0;
  let totalFixedDeductions = 0;
  let totalVariableAllowances = 0;
  let totalVariableDeductions = 0;
  let totalOvertime = 0;
  let totalPenalties = 0;
  let totalGross = 0;
  let totalNet = 0;
  let paidCount = 0;
  let unpaidCount = 0;

  for (const line of lines) {
    totalBaseSalary += money(line.baseSalary);
    totalFixedAllowances += money(line.fixedAllowancesTotal);
    totalFixedDeductions += money(line.fixedDeductionsTotal);
    totalVariableAllowances += money(line.variableAllowancesTotal);
    totalVariableDeductions += money(line.variableDeductionsTotal);
    totalOvertime += money(line.overtimeAmount);
    totalPenalties += money(line.penaltyAmount);
    totalGross += money(line.gross);
    totalNet += money(line.netSalary);

    if (line.paymentStatus === PayrollLinePaymentStatus.PAID) {
      paidCount += 1;
    } else {
      unpaidCount += 1;
    }
  }

  return {
    totalBaseSalary: roundMoney(totalBaseSalary),
    totalFixedAllowances: roundMoney(totalFixedAllowances),
    totalFixedDeductions: roundMoney(totalFixedDeductions),
    totalVariableAllowances: roundMoney(totalVariableAllowances),
    totalVariableDeductions: roundMoney(totalVariableDeductions),
    totalOvertime: roundMoney(totalOvertime),
    totalPenalties: roundMoney(totalPenalties),
    totalGross: roundMoney(totalGross),
    totalNet: roundMoney(totalNet),
    linesCount: lines.length,
    paidCount,
    unpaidCount,
  };
}
