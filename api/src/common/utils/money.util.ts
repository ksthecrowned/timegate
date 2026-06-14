import { Prisma } from '@prisma/client';

export function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

export function computeNetSalary(
  baseSalary: number,
  bonuses = 0,
  deductions = 0,
): number {
  return roundMoney(baseSalary + bonuses - deductions);
}

export function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(roundMoney(value));
}

export function fromDecimal(value: Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return roundMoney(Number(value));
}
