import 'dotenv/config';
import {
  AttendanceStatus,
  EmployeeStatus,
  KioskStatus,
  LeaveApplicationStatus,
  PayrollLinePaymentStatus,
  PrismaClient,
  SalaryComponentType,
  TimeGateAttendanceEventSource,
  TimeGateAttendanceEventStatus,
  TimeGateAttendanceEventType,
  TimeGatePayrollRunStatus,
  CompensationItemKind,
  TimeGateSubscriptionSource,
  TimeGateSubscriptionStatus,
  TimeGateTimesheetDayStatus,
  TimeGateUserRole,
  WeekDay,
} from '@prisma/client';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { generateDocId } from '../src/common/utils/doc-id.util';
import { toDecimal } from '../src/common/utils/money.util';
import { sumPayrollLineTotals } from '../src/payroll-runs/payroll-run-totals.util';
import { createPrismaPg } from '../src/prisma/create-prisma-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: createPrismaPg(pool) });

const ORG_SKU = 'SOTR';
const ORG_NAME = 'SOTRAFER Congo';
const ORG_LOGO_URL = '/images/orgs/sotrafer-logo.svg';
const ACTIVATION_KEY_PLAIN = 'SOTR-DEMO-2026';
const DEMO_KIOSK_PIN = '1234';

function utcDate(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m, d));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function todayUtc() {
  return utcDate(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
}

function payrollPeriodBounds(year: number, month: number, payDayOfMonth = 25) {
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(payDayOfMonth, lastDayOfMonth);
  return {
    periodStart: new Date(Date.UTC(year, month - 1, 1)),
    periodEnd: new Date(Date.UTC(year, month, 0)),
    dueDate: new Date(Date.UTC(year, month - 1, day)),
  };
}

const DEMO_BASE_SALARIES = [420_000, 380_000, 450_000, 520_000, 360_000, 390_000, 410_000, 440_000];

/** Lignes de démo cohérentes avec la formule paie (brut / net / pénalités). */
function buildDemoPayrollLines(input: {
  employees: Array<{ id: string; payDayOfMonth?: number }>;
  payrollRunId: string;
  companyId: string;
  year: number;
  month: number;
  paymentStatus: PayrollLinePaymentStatus;
  paidAt?: Date | null;
  limit?: number;
  /** Variantes allégées (brouillon) : pas de primes / pénalités. */
  plain?: boolean;
}) {
  const employees = input.limit
    ? input.employees.slice(0, input.limit)
    : input.employees;

  return employees.map((emp, idx) => {
    const { periodStart, periodEnd, dueDate } = payrollPeriodBounds(
      input.year,
      input.month,
      emp.payDayOfMonth ?? 25,
    );
    const baseSalary = DEMO_BASE_SALARIES[idx % DEMO_BASE_SALARIES.length]!;
    if (input.plain) {
      return {
        id: generateDocId('PLINE'),
        payrollRunId: input.payrollRunId,
        companyId: input.companyId,
        employeeId: emp.id,
        baseSalary,
        overtimeAmount: 0,
        lateMinutesPenalty: 0,
        absenceAmount: 0,
        penaltyAmount: 0,
        bonusAmount: 0,
        fixedAllowancesTotal: 0,
        fixedDeductionsTotal: 0,
        variableAllowancesTotal: 0,
        variableDeductionsTotal: 0,
        gross: baseSalary,
        netSalary: baseSalary,
        periodStart,
        periodEnd,
        dueDate,
        paymentStatus: input.paymentStatus,
        paidAt: input.paidAt ?? null,
        explainJson: { ruleVersion: 'v2', seeded: true, plain: true },
      };
    }

    const lateMinutesPenalty = idx % 4 === 0 ? 5_000 : 0;
    const absenceAmount = idx % 5 === 0 ? 8_000 : 0;
    const penaltyAmount = lateMinutesPenalty + absenceAmount;
    const overtimeAmount = idx % 3 === 0 ? 12_000 : 0;
    const fixedAllowancesTotal = idx === 0 ? 25_000 : 0;
    // Évite de cumuler prime transport (idx 0) + prime variable sur le même employé
    const variableAllowancesTotal = idx > 0 && idx % 6 === 0 ? 15_000 : 0;
    const bonusAmount = fixedAllowancesTotal + variableAllowancesTotal;
    const gross = baseSalary + bonusAmount + overtimeAmount;
    const netSalary = gross - penaltyAmount;

    return {
      id: generateDocId('PLINE'),
      payrollRunId: input.payrollRunId,
      companyId: input.companyId,
      employeeId: emp.id,
      baseSalary,
      overtimeAmount,
      lateMinutesPenalty,
      absenceAmount,
      penaltyAmount,
      bonusAmount,
      fixedAllowancesTotal,
      fixedDeductionsTotal: 0,
      variableAllowancesTotal,
      variableDeductionsTotal: 0,
      gross,
      netSalary,
      periodStart,
      periodEnd,
      dueDate,
      paymentStatus: input.paymentStatus,
      paidAt: input.paidAt ?? null,
      explainJson: {
        ruleVersion: 'v2',
        seeded: true,
        lateMinutesPenalty,
        absenceAmount,
        overtimeAmount,
        fixedAllowancesTotal,
        variableAllowancesTotal,
      },
    };
  });
}

async function createPayrollRunWithLines(
  prisma: PrismaClient,
  input: {
    companyId: string;
    year: number;
    month: number;
    status: TimeGatePayrollRunStatus;
    lockedAt?: Date | null;
    paidAt?: Date | null;
    lines: ReturnType<typeof buildDemoPayrollLines>;
  },
) {
  const runId = generateDocId('PRUN');
  const lines = input.lines.map((line) => ({ ...line, payrollRunId: runId }));
  const totals = sumPayrollLineTotals(lines);

  const run = await prisma.timeGatePayrollRun.create({
    data: {
      id: runId,
      companyId: input.companyId,
      year: input.year,
      month: input.month,
      status: input.status,
      ruleVersion: 'v2',
      lockedAt: input.lockedAt ?? null,
      paidAt: input.paidAt ?? null,
      totalBaseSalary: toDecimal(totals.totalBaseSalary),
      totalFixedAllowances: toDecimal(totals.totalFixedAllowances),
      totalFixedDeductions: toDecimal(totals.totalFixedDeductions),
      totalVariableAllowances: toDecimal(totals.totalVariableAllowances),
      totalVariableDeductions: toDecimal(totals.totalVariableDeductions),
      totalOvertime: toDecimal(totals.totalOvertime),
      totalPenalties: toDecimal(totals.totalPenalties),
      totalGross: toDecimal(totals.totalGross),
      totalNet: toDecimal(totals.totalNet),
      linesCount: totals.linesCount,
      paidCount: totals.paidCount,
      unpaidCount: totals.unpaidCount,
    },
  });

  await prisma.timeGatePayrollLine.createMany({
    data: lines.map((line) => ({
      ...line,
      baseSalary: toDecimal(line.baseSalary),
      overtimeAmount: toDecimal(line.overtimeAmount),
      lateMinutesPenalty: toDecimal(line.lateMinutesPenalty),
      absenceAmount: toDecimal(line.absenceAmount),
      penaltyAmount: toDecimal(line.penaltyAmount),
      bonusAmount: toDecimal(line.bonusAmount),
      fixedAllowancesTotal: toDecimal(line.fixedAllowancesTotal),
      fixedDeductionsTotal: toDecimal(line.fixedDeductionsTotal),
      variableAllowancesTotal: toDecimal(line.variableAllowancesTotal),
      variableDeductionsTotal: toDecimal(line.variableDeductionsTotal),
      gross: toDecimal(line.gross),
      netSalary: toDecimal(line.netSalary),
    })),
  });

  return run;
}

function isWeekday(d: Date) {
  const day = d.getUTCDay();
  return day >= 1 && day <= 5;
}

function pickAttendanceStatus(seed: number, isHoliday: boolean): AttendanceStatus {
  if (isHoliday) return AttendanceStatus.ON_HOLIDAY;
  if (seed < 5) return AttendanceStatus.ABSENT;
  if (seed < 9) return AttendanceStatus.ON_LEAVE;
  if (seed < 12) return AttendanceStatus.HALF_DAY;
  return AttendanceStatus.PRESENT;
}

type DemoEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  branchId: string;
  departmentId: string;
  designationId: string;
  defaultShiftId: string;
  faceSeed: number;
  payDayOfMonth: number;
};

/**
 * Idempotently create (or return) a self-service `User` account for an
 * employee demo. Each demo employee gets a User with `timeGateRole: EMPLOYEE`
 * and a known password so they can log into the employee portal.
 *
 * Note: `User` has a composite unique on `[email, companyId]`, not on `email`
 * alone, so we look up by both and fall back to create.
 */
async function ensureEmployeeUser(
  prisma: PrismaClient,
  companyId: string,
  email: string,
  passwordHash: string | null,
) {
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { email: normalized, companyId },
  });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        timeGateRole: TimeGateUserRole.EMPLOYEE,
        companyId,
        passwordHash,
      },
    });
  }
  return prisma.user.create({
    data: {
      id: generateDocId('USR'),
      email: normalized,
      passwordHash,
      timeGateRole: TimeGateUserRole.EMPLOYEE,
      companyId,
    },
  });
}

async function seedRichDemoData(params: {
  companyId: string;
  employees: DemoEmployee[];
  leaveTypeId: string;
  holidayDates: Set<string>;
  kioskByBranch: Record<string, string>;
}) {
  const today = utcDate(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
  );
  const from = addDays(today, -45);

  const attendanceRows: Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    attendanceDate: Date;
    status: AttendanceStatus;
    companyId: string;
    shiftId: string;
    leaveTypeId?: string;
  }> = [];

  const timesheetRows: Array<{
    id: string;
    companyId: string;
    employeeId: string;
    workDate: Date;
    workedMinutes: number;
    breakMinutes: number;
    lateMinutes: number;
    overtimeMinutes: number;
    status: TimeGateTimesheetDayStatus;
  }> = [];

  const lateRows: Array<{
    id: string;
    companyId: string;
    employeeId: string;
    recordDate: Date;
    recordAt: Date;
    latenessMinutes: number;
    justified: boolean;
    reason?: string;
    timesheetDayId: string;
  }> = [];

  const absenceRows: Array<{
    id: string;
    companyId: string;
    employeeId: string;
    recordDate: Date;
    justified: boolean;
    reason?: string;
    attendanceId: string;
  }> = [];

  const eventRows: Array<{
    id: string;
    companyId: string;
    branchId: string;
    kioskId: string;
    employeeId: string;
    type: TimeGateAttendanceEventType;
    status: TimeGateAttendanceEventStatus;
    source: TimeGateAttendanceEventSource;
    occurredAt: Date;
    confidence: number;
  }> = [];

  let dayIndex = 0;
  for (let cursor = new Date(from); cursor <= today; cursor = addDays(cursor, 1)) {
    if (!isWeekday(cursor)) continue;
    const iso = dateKey(cursor);
    const isHoliday = params.holidayDates.has(iso);
    const isRecent = cursor >= addDays(today, -7);

    for (const employee of params.employees) {
      const seed =
        (employee.faceSeed * 17 + dayIndex * 13 + iso.charCodeAt(iso.length - 1)) % 100;
      const status = pickAttendanceStatus(seed, isHoliday);
      const attendanceId = generateDocId('ATT');
      const shiftId = employee.defaultShiftId;

      attendanceRows.push({
        id: attendanceId,
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        attendanceDate: new Date(cursor),
        status,
        companyId: params.companyId,
        shiftId,
        ...(status === AttendanceStatus.ON_LEAVE ? { leaveTypeId: params.leaveTypeId } : {}),
      });

      const isWorked =
        status === AttendanceStatus.PRESENT ||
        status === AttendanceStatus.HALF_DAY;

      if (isWorked) {
        const lateMinutes = seed % 11 === 0 ? 10 + (seed % 4) * 5 : seed % 17 === 0 ? 25 : 0;
        const workedMinutes =
          status === AttendanceStatus.HALF_DAY ? 240 : 480 - lateMinutes + (seed % 3) * 15;
        const timesheetId = generateDocId('TSD');
        const isToday = iso === dateKey(today);

        timesheetRows.push({
          id: timesheetId,
          companyId: params.companyId,
          employeeId: employee.id,
          workDate: new Date(cursor),
          workedMinutes,
          breakMinutes: 60,
          lateMinutes,
          overtimeMinutes: seed % 9 === 0 ? 30 + (seed % 3) * 15 : 0,
          status: isToday ? TimeGateTimesheetDayStatus.OPEN : TimeGateTimesheetDayStatus.CLOSED,
        });

        if (lateMinutes > 0) {
          lateRows.push({
            id: generateDocId('LATE'),
            companyId: params.companyId,
            employeeId: employee.id,
            recordDate: new Date(cursor),
            recordAt: new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate(), 8, 30 + lateMinutes)),
            latenessMinutes: lateMinutes,
            justified: seed % 23 === 0,
            reason: seed % 23 === 0 ? 'Transport en commun' : undefined,
            timesheetDayId: timesheetId,
          });
        }

        if (isRecent && params.kioskByBranch[employee.branchId]) {
          const base = new Date(cursor);
          eventRows.push(
            {
              id: generateDocId('AEV'),
              companyId: params.companyId,
              branchId: employee.branchId,
              kioskId: params.kioskByBranch[employee.branchId],
              employeeId: employee.id,
              type: TimeGateAttendanceEventType.CHECK_IN,
              status: TimeGateAttendanceEventStatus.ACCEPTED,
              source: TimeGateAttendanceEventSource.KIOSK_ONLINE,
              occurredAt: new Date(
                Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 8, lateMinutes),
              ),
              confidence: 0.88 + (seed % 10) / 100,
            },
            {
              id: generateDocId('AEV'),
              companyId: params.companyId,
              branchId: employee.branchId,
              kioskId: params.kioskByBranch[employee.branchId],
              employeeId: employee.id,
              type: TimeGateAttendanceEventType.CHECK_OUT,
              status: TimeGateAttendanceEventStatus.ACCEPTED,
              source: TimeGateAttendanceEventSource.KIOSK_ONLINE,
              occurredAt: new Date(
                Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), 17, 5),
              ),
              confidence: 0.9 + (seed % 8) / 100,
            },
          );
        }
      }

      if (status === AttendanceStatus.ABSENT) {
        absenceRows.push({
          id: generateDocId('ABS'),
          companyId: params.companyId,
          employeeId: employee.id,
          recordDate: new Date(cursor),
          justified: seed % 19 === 0,
          reason: seed % 19 === 0 ? 'Certificat médical' : 'Absence non justifiée',
          attendanceId,
        });
      }
    }

    dayIndex += 1;
  }

  await prisma.attendance.createMany({ data: attendanceRows, skipDuplicates: true });
  await prisma.timeGateTimesheetDay.createMany({ data: timesheetRows, skipDuplicates: true });
  if (lateRows.length) {
    await prisma.timeGateLateRecord.createMany({ data: lateRows, skipDuplicates: true });
  }
  if (absenceRows.length) {
    await prisma.timeGateAbsenceRecord.createMany({ data: absenceRows, skipDuplicates: true });
  }
  if (eventRows.length) {
    await prisma.timeGateAttendanceEvent.createMany({ data: eventRows, skipDuplicates: true });
  }
}

async function cleanupOrphanShiftTypes() {
  const orphanIds = (
    await prisma.shiftType.findMany({
      where: { companyId: null },
      select: { id: true },
    })
  ).map((row) => row.id);
  if (orphanIds.length === 0) return;

  await prisma.shiftAssignment.deleteMany({ where: { shiftTypeId: { in: orphanIds } } });
  await prisma.attendance.deleteMany({ where: { shiftId: { in: orphanIds } } });
  await prisma.employeeCheckin.deleteMany({ where: { shiftId: { in: orphanIds } } });
  await prisma.employee.updateMany({
    where: { defaultShiftId: { in: orphanIds } },
    data: { defaultShiftId: null },
  });
  await prisma.shiftTypeWeekDay.deleteMany({ where: { shiftTypeId: { in: orphanIds } } });
  await prisma.shiftType.deleteMany({ where: { id: { in: orphanIds } } });
}

async function resetDemoSeed() {
  await cleanupOrphanShiftTypes();

  for (const sku of [ORG_SKU, 'TMGT']) {
    const legacy = await prisma.company.findFirst({ where: { sku } });
    if (legacy) await purgeCompany(legacy);
  }
}

async function purgeCompany(company: { id: string }) {

  await prisma.timeGateAuditLog.deleteMany({ where: { companyId: company.id } });
  await prisma.timeGateAttendanceEvent.deleteMany({ where: { companyId: company.id } });
  await prisma.faceRecognitionLog.deleteMany({ where: { companyId: company.id } });
  await prisma.attendance.deleteMany({ where: { companyId: company.id } });
  await prisma.leaveApplication.deleteMany({ where: { companyId: company.id } });
  await prisma.leaveAllocation.deleteMany({ where: { employee: { companyId: company.id } } });
  await prisma.holiday.deleteMany({ where: { holidayList: { companyId: company.id } } });
  await prisma.holidayList.deleteMany({ where: { companyId: company.id } });
  await prisma.leaveType.deleteMany({ where: { companyId: company.id } });
  await prisma.timeGateTimesheetOverride.deleteMany({ where: { companyId: company.id } });
  await prisma.timeGateTimesheetDay.deleteMany({ where: { companyId: company.id } });
  await prisma.timeGateLateRecord.deleteMany({ where: { companyId: company.id } });
  await prisma.timeGateAbsenceRecord.deleteMany({ where: { companyId: company.id } });
  await prisma.payrollVariableItem.deleteMany({ where: { companyId: company.id } });
  await prisma.timeGatePayrollLine.deleteMany({ where: { companyId: company.id } });
  await prisma.timeGatePayrollRun.deleteMany({ where: { companyId: company.id } });
  await prisma.employeeCompensationItem.deleteMany({ where: { companyId: company.id } });
  await prisma.compensationGrid.deleteMany({ where: { companyId: company.id } });
  await prisma.timeGateEmployeeContract.deleteMany({ where: { companyId: company.id } });
  await prisma.timeGateSalaryRecord.deleteMany({ where: { companyId: company.id } });
  await prisma.salarySlip.deleteMany({ where: { companyId: company.id } });
  await prisma.payrollEntry.deleteMany({ where: { companyId: company.id } });
  await prisma.paymentEntry.deleteMany({ where: { companyId: company.id } });
  await prisma.salaryStructureAssignment.deleteMany({ where: { companyId: company.id } });
  await prisma.salaryStructureDetail.deleteMany({
    where: { salaryStructure: { companyId: company.id } },
  });
  await prisma.salaryStructure.deleteMany({ where: { companyId: company.id } });
  await prisma.salaryComponent.deleteMany({ where: { companyId: company.id } });
  await prisma.account.deleteMany({ where: { companyId: company.id } });
  await prisma.department.deleteMany({ where: { companyId: company.id } });
  await prisma.timeGateShiftSwapRequest.deleteMany({ where: { companyId: company.id } });
  await prisma.shiftAssignment.deleteMany({ where: { companyId: company.id } });
  await prisma.shiftTypeWeekDay.deleteMany({ where: { shiftType: { companyId: company.id } } });
  await prisma.shiftType.deleteMany({ where: { companyId: company.id } });
  await prisma.shiftLocation.deleteMany({ where: { branch: { companyId: company.id } } });
  await prisma.employeeCheckin.deleteMany({ where: { employee: { companyId: company.id } } });
  await prisma.employee.deleteMany({ where: { companyId: company.id } });
  await prisma.payGroup.deleteMany({ where: { companyId: company.id } });
  await prisma.designation.deleteMany({ where: { companyId: company.id } });
  await prisma.employmentType.deleteMany({ where: { companyId: company.id } });
  await prisma.timeGateKiosk.deleteMany({ where: { companyId: company.id } });
  await prisma.branch.deleteMany({ where: { companyId: company.id } });
  await prisma.timeGateActivationKey.deleteMany({ where: { companyId: company.id } });
  await prisma.timeGateSubscription.deleteMany({ where: { companyId: company.id } });
  await prisma.timeGateSystemSettings.deleteMany({ where: { companyId: company.id } });
  await prisma.user.deleteMany({ where: { companyId: company.id } });
  await prisma.company.delete({ where: { id: company.id } });
}

async function resetPlatformAdmin() {
  await prisma.admin.deleteMany({
    where: { email: 'superadmin@monorganisation.com' },
  });
  // Legacy: platform operators used to live on tabUser as SUPER_ADMIN.
  await prisma.user.deleteMany({
    where: { email: 'superadmin@monorganisation.com', companyId: null },
  });
}

async function main() {
  await resetDemoSeed();
  await resetPlatformAdmin();

  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
  const demoKioskPinHash = await bcrypt.hash(DEMO_KIOSK_PIN, 10);
  const activationHash = createHash('sha256').update(ACTIVATION_KEY_PLAIN).digest('hex');

  const countryCg = await prisma.country.upsert({
    where: { isoCode: 'CG' },
    update: { name: 'République du Congo', phoneCode: '+242' },
    create: {
      id: generateDocId('CN'),
      name: 'République du Congo',
      isoCode: 'CG',
      phoneCode: '+242',
    },
  });

  const cityBrazzaville = await prisma.city.upsert({
    where: { countryId_name: { countryId: countryCg.id, name: 'Brazzaville' } },
    update: { latitude: -4.2634, longitude: 15.2429 },
    create: {
      id: generateDocId('CT'),
      name: 'Brazzaville',
      countryId: countryCg.id,
      latitude: -4.2634,
      longitude: 15.2429,
    },
  });

  const cityPointeNoire = await prisma.city.upsert({
    where: { countryId_name: { countryId: countryCg.id, name: 'Pointe-Noire' } },
    update: { latitude: -4.7692, longitude: 11.8636 },
    create: {
      id: generateDocId('CT'),
      name: 'Pointe-Noire',
      countryId: countryCg.id,
      latitude: -4.7692,
      longitude: 11.8636,
    },
  });

  const company = await prisma.company.create({
    data: {
      id: generateDocId('CO'),
      name: ORG_NAME,
      sku: ORG_SKU,
      abbr: 'SOTR',
      timeZone: 'Africa/Brazzaville',
      logoUrl: ORG_LOGO_URL,
      phone: '+242 06 123 4567',
      email: 'contact@sotrafer.cg',
      website: 'https://www.sotrafer.cg',
      address: 'Avenue Amical Cabral, Brazzaville',
    },
  });

  // Même consigne que le signup : un groupe de paie par défaut obligatoire.
  const defaultPayGroup = await prisma.payGroup.create({
    data: {
      id: generateDocId('PGRP'),
      companyId: company.id,
      name: 'Paie mensuelle',
      payDayOfMonth: 25,
      isDefault: true,
    },
  });

  const midMonthPayGroup = await prisma.payGroup.create({
    data: {
      id: generateDocId('PGRP'),
      companyId: company.id,
      name: 'Échéance 15',
      payDayOfMonth: 15,
      isDefault: false,
    },
  });

  await prisma.timeGateSystemSettings.create({
    data: {
      id: generateDocId('CFG'),
      companyId: company.id,
      minConfidence: 0.75,
      lateThreshold: 10,
      veryLateThreshold: 30,
    },
  });

  await prisma.timeGateActivationKey.create({
    data: {
      id: generateDocId('KEY'),
      companyId: company.id,
      keyHash: activationHash,
      plan: 'PRO',
      planId: 'PLN-PRO',
      maxEmployees: 200,
      maxKiosks: 20,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    },
  });

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await prisma.timeGateSubscription.create({
    data: {
      id: generateDocId('SUB'),
      companyId: company.id,
      plan: 'PRO',
      maxEmployees: 200,
      maxKiosks: 20,
      status: TimeGateSubscriptionStatus.ACTIVE,
      source: TimeGateSubscriptionSource.MANUAL,
      trialEndsAt,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    },
  });

  await prisma.user.create({
    data: {
      id: generateDocId('USR'),
      email: 'admin@monorganisation.com',
      passwordHash,
      timeGateRole: TimeGateUserRole.ADMIN,
      companyId: company.id,
    },
  });

  await prisma.user.create({
    data: {
      id: generateDocId('USR'),
      email: 'manager@monorganisation.com',
      passwordHash,
      timeGateRole: TimeGateUserRole.MANAGER,
      companyId: company.id,
    },
  });

  await prisma.admin.upsert({
    where: { email: 'superadmin@monorganisation.com' },
    update: { passwordHash, enabled: true },
    create: {
      id: generateDocId('ADM'),
      email: 'superadmin@monorganisation.com',
      passwordHash,
      enabled: true,
    },
  });

  const hq = await prisma.branch.create({
    data: {
      id: generateDocId('BR'),
      branchName: 'Siège Poto-Poto',
      branchCode: 'BZV-01',
      address: 'Avenue Amical Cabral, Poto-Poto',
      timeZone: 'Africa/Brazzaville',
      companyId: company.id,
      countryId: countryCg.id,
      cityId: cityBrazzaville.id,
      latitude: -4.2634,
      longitude: 15.2429,
      checkinRadius: 150,
      phone: '+242 06 000 0001',
      email: 'brazzaville@sotrafer.cg',
      isHeadOffice: true,
      isActive: true,
    },
  });

  const west = await prisma.branch.create({
    data: {
      id: generateDocId('BR'),
      branchName: 'Antenne Pointe-Noire',
      branchCode: 'PNR-01',
      address: 'Boulevard du Général de Gaulle',
      timeZone: 'Africa/Brazzaville',
      companyId: company.id,
      countryId: countryCg.id,
      cityId: cityPointeNoire.id,
      latitude: -4.7692,
      longitude: 11.8636,
      checkinRadius: 120,
      phone: '+242 06 000 0002',
      email: 'pointe-noire@sotrafer.cg',
      isActive: true,
    },
  });

  const kioskHq = await prisma.timeGateKiosk.create({
    data: {
      id: generateDocId('KSK'),
      kioskName: 'Kiosque Brazzaville',
      companyId: company.id,
      branchId: hq.id,
      status: KioskStatus.ONLINE,
      lastSeenAt: new Date(),
    },
  });

  const kioskWest = await prisma.timeGateKiosk.create({
    data: {
      id: generateDocId('KSK'),
      kioskName: 'Kiosque Pointe-Noire',
      companyId: company.id,
      branchId: west.id,
      status: KioskStatus.OFFLINE,
    },
  });

  const hqSchedule = await prisma.shiftType.create({
    data: {
      id: generateDocId('SHIFT'),
      shiftName: 'Journée standard Brazzaville',
      companyId: company.id,
      branchId: hq.id,
      startTime: new Date('1970-01-01T08:00:00.000Z'),
      endTime: new Date('1970-01-01T17:00:00.000Z'),
      lateGraceMinutes: 10,
    },
  });

  const weekdays: WeekDay[] = [
    WeekDay.MONDAY,
    WeekDay.TUESDAY,
    WeekDay.WEDNESDAY,
    WeekDay.THURSDAY,
    WeekDay.FRIDAY,
  ];
  await prisma.shiftTypeWeekDay.createMany({
    data: weekdays.map((day, idx) => ({
      id: generateDocId('SWD'),
      shiftTypeId: hqSchedule.id,
      day,
      startTime: '08:00',
      endTime: '17:00',
      idx,
    })),
  });

  const westSchedule = await prisma.shiftType.create({
    data: {
      id: generateDocId('SHIFT'),
      shiftName: 'Journée standard Pointe-Noire',
      companyId: company.id,
      branchId: west.id,
      startTime: new Date('1970-01-01T09:00:00.000Z'),
      endTime: new Date('1970-01-01T18:00:00.000Z'),
      lateGraceMinutes: 10,
    },
  });

  await prisma.shiftTypeWeekDay.createMany({
    data: weekdays.map((day, idx) => ({
      id: generateDocId('SWD'),
      shiftTypeId: westSchedule.id,
      day,
      startTime: '09:00',
      endTime: '18:00',
      idx,
    })),
  });

  const engineeringDept = await prisma.department.create({
    data: {
      id: generateDocId('DEPT'),
      departmentName: 'Exploitation',
      code: 'EXP',
      description: 'Gestion des opérations terrain',
      companyId: company.id,
    },
  });

  const developerDesignation = await prisma.designation.create({
    data: {
      id: generateDocId('DESIG'),
      designationName: 'Agent logistique',
      grade: 'Senior',
      companyId: company.id,
    },
  });

  const cdiType = await prisma.employmentType.create({
    data: {
      id: generateDocId('EMPT'),
      employeeTypeName: 'CDI',
      companyId: company.id,
    },
  });
  await prisma.employmentType.create({
    data: {
      id: generateDocId('EMPT'),
      employeeTypeName: 'CDD',
      companyId: company.id,
    },
  });
  await prisma.employmentType.create({
    data: {
      id: generateDocId('EMPT'),
      employeeTypeName: 'Stage',
      companyId: company.id,
    },
  });

  const hrDept = await prisma.department.create({
    data: {
      id: generateDocId('DEPT'),
      departmentName: 'Ressources humaines',
      code: 'RH',
      companyId: company.id,
    },
  });

  const hrDesignation = await prisma.designation.create({
    data: {
      id: generateDocId('DESIG'),
      designationName: 'Responsable RH',
      grade: 'Manager',
      companyId: company.id,
    },
  });

  const opsDept = await prisma.department.create({
    data: {
      id: generateDocId('DEPT'),
      departmentName: 'Finance',
      code: 'FIN',
      companyId: company.id,
    },
  });

  const opsDesignation = await prisma.designation.create({
    data: {
      id: generateDocId('DESIG'),
      designationName: 'Comptable',
      grade: 'Junior',
      companyId: company.id,
    },
  });

  const employeeUser = await prisma.user.create({
    data: {
      id: generateDocId('USR'),
      email: 'patrick.mukendi@sotrafer.cg',
      passwordHash,
      timeGateRole: TimeGateUserRole.EMPLOYEE,
      companyId: company.id,
    },
  });

  const adaEmployee = await prisma.employee.create({
    data: {
      id: generateDocId('EMP'),
      employeeName: 'Patrick Mukendi',
      firstName: 'Patrick',
      lastName: 'Mukendi',
      personalEmail: 'patrick.mukendi@sotrafer.cg',
      cellNumber: '+242 06 123 4567',
      nationality: 'Congolaise',
      gender: 'Male',
      nationalIdNumber: 'CG-BZV-2019-45821',
      companyId: company.id,
      branchId: hq.id,
      defaultShiftId: hqSchedule.id,
      departmentId: engineeringDept.id,
      designationId: developerDesignation.id,
      employmentTypeId: cdiType.id,
      userId: employeeUser.id,
      status: EmployeeStatus.ACTIVE,
      salaryCurrency: 'XAF',
      payGroupId: defaultPayGroup.id,
      faceEmbedding: [0.01, 0.02, 0.03],
      faceEnrolledAt: new Date(),
      kioskPinHash: demoKioskPinHash,
    },
  });

  const contractSignedAt = new Date();
  contractSignedAt.setFullYear(contractSignedAt.getFullYear() - 1);
  const contractExpiresAt = new Date();
  contractExpiresAt.setMonth(contractExpiresAt.getMonth() + 2);

  await prisma.shiftAssignment.create({
    data: {
      id: generateDocId('SASN'),
      employeeId: adaEmployee.id,
      shiftTypeId: hqSchedule.id,
      companyId: company.id,
    },
  });

  await prisma.timeGateEmployeeContract.create({
    data: {
      id: generateDocId('CTR'),
      companyId: company.id,
      employeeId: adaEmployee.id,
      signedAt: contractSignedAt,
      expiresAt: contractExpiresAt,
      renewalsCount: 0,
      notes: 'Contrat CDI demo (expire dans ~2 mois pour alertes RH)',
      isCurrent: true,
    },
  });

  const leaveType = await prisma.leaveType.create({
    data: {
      id: generateDocId('LT'),
      leaveTypeName: 'Annual Leave',
      companyId: company.id,
      maxDaysPerYear: 22,
    },
  });

  await prisma.leaveType.create({
    data: {
      id: generateDocId('LT'),
      leaveTypeName: 'Sick Leave',
      companyId: company.id,
      isLwp: true,
      maxDaysPerYear: 10,
    },
  });

  const holidayList = await prisma.holidayList.create({
    data: {
      id: generateDocId('HLIST'),
      holidayListName: `${ORG_NAME} Holidays`,
      companyId: company.id,
    },
  });

  await prisma.holiday.create({
    data: {
      id: generateDocId('HOL'),
      parentId: holidayList.id,
      description: 'New Year',
      holidayDate: utcDate(new Date().getUTCFullYear(), 0, 1),
    },
  });

  const holidayDates = new Set<string>([dateKey(utcDate(new Date().getUTCFullYear(), 0, 1))]);
  const year = new Date().getUTCFullYear();
  const extraHolidays = [
    { name: 'Fête du travail', month: 4, day: 1 },
    { name: 'Journée de la réconciliation nationale', month: 5, day: 10 },
    { name: 'Fête nationale', month: 7, day: 15 },
    { name: 'Toussaint', month: 10, day: 1 },
    { name: 'Fête de la République', month: 10, day: 28 },
    { name: 'Noël', month: 11, day: 25 },
  ];
  for (const h of extraHolidays) {
    const d = utcDate(year, h.month, h.day);
    holidayDates.add(dateKey(d));
    await prisma.holiday.create({
      data: {
        id: generateDocId('HOL'),
        parentId: holidayList.id,
        description: h.name,
        holidayDate: d,
      },
    });
  }

  const payrollPayableAccount = await prisma.account.create({
    data: {
      id: generateDocId('ACC'),
      accountName: 'Payroll Payable',
      companyId: company.id,
      accountType: 'Payable',
    },
  });
  await prisma.company.update({
    where: { id: company.id },
    data: { defaultPayrollPayableAccountId: payrollPayableAccount.id },
  });

  const basicPayComponent = await prisma.salaryComponent.create({
    data: {
      id: generateDocId('SC'),
      salaryComponentName: 'Basic',
      type: SalaryComponentType.EARNING,
      companyId: company.id,
    },
  });

  const monthlyStructure = await prisma.salaryStructure.create({
    data: {
      id: generateDocId('SS'),
      name: 'Monthly Standard',
      companyId: company.id,
      payrollFrequency: 'Monthly',
    },
  });

  await prisma.salaryStructureDetail.create({
    data: {
      id: generateDocId('SSD'),
      parentId: monthlyStructure.id,
      salaryComponentId: basicPayComponent.id,
      amount: 0,
    },
  });

  await prisma.salaryStructureAssignment.create({
    data: {
      id: generateDocId('SSA'),
      employeeId: adaEmployee.id,
      salaryStructureId: monthlyStructure.id,
      companyId: company.id,
      fromDate: new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1)),
    },
  });

  const alanUser = await ensureEmployeeUser(
    prisma,
    company.id,
    'alan.turing@example.com',
    passwordHash,
  );

  const alanEmployee = await prisma.employee.create({
    data: {
      id: generateDocId('EMP'),
      employeeName: 'Alan Turing',
      firstName: 'Alan',
      lastName: 'Turing',
      personalEmail: 'alan.turing@example.com',
      userId: alanUser.id,
      companyId: company.id,
      branchId: west.id,
      defaultShiftId: westSchedule.id,
      departmentId: engineeringDept.id,
      designationId: developerDesignation.id,
      employmentTypeId: cdiType.id,
      status: EmployeeStatus.ACTIVE,
      salaryCurrency: 'XAF',
      payGroupId: midMonthPayGroup.id,
      faceEmbedding: [0.1, 0.2, 0.3],
      faceEnrolledAt: new Date(),
    },
  });

  await prisma.shiftAssignment.create({
    data: {
      id: generateDocId('SASN'),
      employeeId: alanEmployee.id,
      shiftTypeId: westSchedule.id,
      companyId: company.id,
    },
  });

  const extraEmployeeDefs: Omit<DemoEmployee, 'id'>[] = [
    {
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace.hopper@example.com',
      branchId: hq.id,
      departmentId: engineeringDept.id,
      designationId: developerDesignation.id,
      defaultShiftId: hqSchedule.id,
      faceSeed: 2,
    },
    {
      firstName: 'Linus',
      lastName: 'Torvalds',
      email: 'linus.torvalds@example.com',
      branchId: hq.id,
      departmentId: engineeringDept.id,
      designationId: developerDesignation.id,
      defaultShiftId: hqSchedule.id,
      faceSeed: 3,
    },
    {
      firstName: 'Marie',
      lastName: 'Curie',
      email: 'marie.curie@example.com',
      branchId: hq.id,
      departmentId: hrDept.id,
      designationId: hrDesignation.id,
      defaultShiftId: hqSchedule.id,
      faceSeed: 4,
    },
    {
      firstName: 'Katherine',
      lastName: 'Johnson',
      email: 'katherine.johnson@example.com',
      branchId: west.id,
      departmentId: opsDept.id,
      designationId: opsDesignation.id,
      defaultShiftId: westSchedule.id,
      faceSeed: 5,
    },
    {
      firstName: 'Nikola',
      lastName: 'Tesla',
      email: 'nikola.tesla@example.com',
      branchId: west.id,
      departmentId: opsDept.id,
      designationId: opsDesignation.id,
      defaultShiftId: westSchedule.id,
      faceSeed: 6,
    },
    {
      firstName: 'Rosalind',
      lastName: 'Franklin',
      email: 'rosalind.franklin@example.com',
      branchId: hq.id,
      departmentId: engineeringDept.id,
      designationId: developerDesignation.id,
      defaultShiftId: hqSchedule.id,
      faceSeed: 7,
    },
  ];

  const extraEmployees: DemoEmployee[] = [];
  for (const emp of extraEmployeeDefs) {
    const payDayOfMonth = emp.faceSeed % 3 === 0 ? midMonthPayGroup.payDayOfMonth : defaultPayGroup.payDayOfMonth;
    const created: DemoEmployee = { ...emp, id: generateDocId('EMP'), payDayOfMonth };
    // Grace Hopper: portal user without password — demo OTP onboarding flow.
    const employeeUser = await ensureEmployeeUser(
      prisma,
      company.id,
      emp.email,
      emp.email === 'grace.hopper@example.com' ? null : passwordHash,
    );
    await prisma.employee.create({
      data: {
        id: created.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        firstName: emp.firstName,
        lastName: emp.lastName,
        personalEmail: emp.email,
        userId: employeeUser.id,
        companyId: company.id,
        branchId: emp.branchId,
        defaultShiftId: emp.defaultShiftId,
        departmentId: emp.departmentId,
        designationId: emp.designationId,
        employmentTypeId: cdiType.id,
        status: EmployeeStatus.ACTIVE,
        salaryCurrency: 'XAF',
        payGroupId: emp.faceSeed % 3 === 0 ? midMonthPayGroup.id : defaultPayGroup.id,
        faceEmbedding: [emp.faceSeed / 10, 0.2, 0.3],
        faceEnrolledAt: new Date(),
      },
    });
    extraEmployees.push(created);
  }

  const graceEmployee = extraEmployees.find((e) => e.email === 'grace.hopper@example.com');
  if (graceEmployee) {
    await prisma.shiftAssignment.create({
      data: {
        id: generateDocId('SASN'),
        employeeId: graceEmployee.id,
        shiftTypeId: hqSchedule.id,
        companyId: company.id,
      },
    });
  }

  const demoEmployees: DemoEmployee[] = [
    {
      id: adaEmployee.id,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'patrick.mukendi@sotrafer.cg',
      branchId: hq.id,
      departmentId: engineeringDept.id,
      designationId: developerDesignation.id,
      defaultShiftId: hqSchedule.id,
      faceSeed: 1,
      payDayOfMonth: defaultPayGroup.payDayOfMonth,
    },
    {
      id: alanEmployee.id,
      firstName: 'Alan',
      lastName: 'Turing',
      email: 'alan.turing@example.com',
      branchId: west.id,
      departmentId: engineeringDept.id,
      designationId: developerDesignation.id,
      defaultShiftId: westSchedule.id,
      faceSeed: 8,
      payDayOfMonth: midMonthPayGroup.payDayOfMonth,
    },
    ...extraEmployees,
  ];

  const employeeByEmail = (email: string) => {
    const found = demoEmployees.find((e) => e.email === email);
    if (!found) throw new Error(`Seed employee not found: ${email}`);
    return found;
  };

  await prisma.leaveApplication.createMany({
    data: [
      {
        id: generateDocId('LEAVE'),
        employeeId: adaEmployee.id,
        leaveTypeId: leaveType.id,
        companyId: company.id,
        fromDate: addDays(todayUtc(), -20),
        toDate: addDays(todayUtc(), -18),
        status: LeaveApplicationStatus.APPROVED,
        reason: 'Congés annuels',
      },
      {
        id: generateDocId('LEAVE'),
        employeeId: employeeByEmail('alan.turing@example.com').id,
        leaveTypeId: leaveType.id,
        companyId: company.id,
        fromDate: addDays(todayUtc(), 5),
        toDate: addDays(todayUtc(), 7),
        status: LeaveApplicationStatus.OPEN,
        reason: 'Conférence tech',
      },
      {
        id: generateDocId('LEAVE'),
        employeeId: employeeByEmail('marie.curie@example.com').id,
        leaveTypeId: leaveType.id,
        companyId: company.id,
        fromDate: addDays(todayUtc(), -10),
        toDate: addDays(todayUtc(), -9),
        status: LeaveApplicationStatus.APPROVED,
        reason: 'Formation RH',
      },
      {
        id: generateDocId('LEAVE'),
        employeeId: employeeByEmail('grace.hopper@example.com').id,
        leaveTypeId: leaveType.id,
        companyId: company.id,
        fromDate: addDays(todayUtc(), 12),
        toDate: addDays(todayUtc(), 14),
        status: LeaveApplicationStatus.OPEN,
        reason: 'Vacances familiales',
      },
    ],
  });

  const payrollMonth = todayUtc().getUTCMonth() + 1;
  const payrollYear = todayUtc().getUTCFullYear();
  const prevMonth = payrollMonth === 1 ? 12 : payrollMonth - 1;
  const prevYear = payrollMonth === 1 ? payrollYear - 1 : payrollYear;
  const partialMonth = prevMonth === 1 ? 12 : prevMonth - 1;
  const partialYear = prevMonth === 1 ? prevYear - 1 : prevYear;

  const paidAt = addDays(todayUtc(), -5);
  const lockedAt = addDays(todayUtc(), -8);

  const paidRun = await createPayrollRunWithLines(prisma, {
    companyId: company.id,
    year: prevYear,
    month: prevMonth,
    status: TimeGatePayrollRunStatus.PAID,
    lockedAt,
    paidAt,
    lines: buildDemoPayrollLines({
      employees: demoEmployees,
      payrollRunId: 'pending',
      companyId: company.id,
      year: prevYear,
      month: prevMonth,
      paymentStatus: PayrollLinePaymentStatus.PAID,
      paidAt,
    }),
  });

  const partialPaidAt = addDays(todayUtc(), -12);
  const partialLockedAt = addDays(todayUtc(), -15);
  const partialRun = await createPayrollRunWithLines(prisma, {
    companyId: company.id,
    year: partialYear,
    month: partialMonth,
    status: TimeGatePayrollRunStatus.PARTIALLY_PAID,
    lockedAt: partialLockedAt,
    paidAt: null,
    lines: buildDemoPayrollLines({
      employees: demoEmployees,
      payrollRunId: 'pending',
      companyId: company.id,
      year: partialYear,
      month: partialMonth,
      paymentStatus: PayrollLinePaymentStatus.UNPAID,
    }).map((line, idx) =>
      idx < 3
        ? {
            ...line,
            paymentStatus: PayrollLinePaymentStatus.PAID,
            paidAt: partialPaidAt,
          }
        : line,
    ),
  });

  const draftRun = await createPayrollRunWithLines(prisma, {
    companyId: company.id,
    year: payrollYear,
    month: payrollMonth,
    status: TimeGatePayrollRunStatus.DRAFT,
    lines: buildDemoPayrollLines({
      employees: demoEmployees,
      payrollRunId: 'pending',
      companyId: company.id,
      year: payrollYear,
      month: payrollMonth,
      paymentStatus: PayrollLinePaymentStatus.UNPAID,
      limit: 5,
      plain: true,
    }),
  });

  await prisma.compensationGrid.createMany({
    data: [
      {
        id: generateDocId('CGRID'),
        companyId: company.id,
        designationId: developerDesignation.id,
        employmentTypeId: cdiType.id,
        baseSalary: 420_000,
        effectiveFrom: new Date(Date.UTC(payrollYear - 1, 0, 1)),
      },
      {
        id: generateDocId('CGRID'),
        companyId: company.id,
        designationId: hrDesignation.id,
        employmentTypeId: cdiType.id,
        baseSalary: 520_000,
        effectiveFrom: new Date(Date.UTC(payrollYear - 1, 0, 1)),
      },
      {
        id: generateDocId('CGRID'),
        companyId: company.id,
        designationId: opsDesignation.id,
        employmentTypeId: cdiType.id,
        baseSalary: 450_000,
        effectiveFrom: new Date(Date.UTC(payrollYear - 1, 0, 1)),
      },
    ],
  });

  const transportEmployee = demoEmployees[0];
  if (transportEmployee) {
    await prisma.employeeCompensationItem.create({
      data: {
        id: generateDocId('ECITEM'),
        companyId: company.id,
        employeeId: transportEmployee.id,
        label: 'Prime de transport',
        kind: CompensationItemKind.ALLOWANCE,
        amount: 25_000,
        isRecurring: true,
        effectiveFrom: new Date(Date.UTC(payrollYear - 1, 0, 1)),
        isActive: true,
      },
    });
  }

  await seedRichDemoData({
    companyId: company.id,
    employees: demoEmployees,
    leaveTypeId: leaveType.id,
    holidayDates,
    kioskByBranch: {
      [hq.id]: kioskHq.id,
      [west.id]: kioskWest.id,
    },
  });

  console.log('Seed complete (schema 1.2.0).', {
    company: { id: company.id, name: company.name, sku: company.sku },
    branches: [hq.branchName, west.branchName],
    employees: demoEmployees.length,
    attendanceDays: '~45 jours ouvrés × employés',
    kioskHq: kioskHq.id,
    workSchedule: hqSchedule.id,
    leaveType: leaveType.id,
    holidayList: holidayList.id,
    payrollRuns: [paidRun.id, partialRun.id, draftRun.id],
    payGroups: [defaultPayGroup.id, midMonthPayGroup.id],
    payrollAccount: payrollPayableAccount.id,
    salaryStructure: monthlyStructure.id,
    password: 'ChangeMe123!',
    employeeLogin: 'patrick.mukendi@sotrafer.cg',
    kioskPinDemo: { employee: 'Patrick Mukendi', pin: DEMO_KIOSK_PIN },
    activationKey: ACTIVATION_KEY_PLAIN,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
