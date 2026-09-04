/**
 * Clean overnight timesheet smoke: create night shift, assign one day,
 * seed CI/CO across midnight, recalculate, assert pairing.
 * Run: bun run scripts/smoke-overnight-timesheets-clean.ts
 */
import { PrismaClient, WeekDay } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { login, request, authHeader } from './test/helpers.mjs';

function docId(prefix: string) {
  return `${prefix}-${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL missing');
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const company = await prisma.company.findFirst({
      where: { sku: 'SOTR' },
      select: { id: true, timeZone: true },
    });
    const branch = await prisma.branch.findFirst({
      where: { companyId: company!.id },
      select: { id: true },
    });
    const kiosk = await prisma.timeGateKiosk.findFirst({
      where: { companyId: company!.id },
      select: { id: true, branchId: true },
    });
    const employee = await prisma.employee.findFirst({
      where: { companyId: company!.id, status: 'ACTIVE', id: { not: 'EMP-72e03d3114b26341' } },
      select: { id: true, employeeName: true, firstName: true },
    });
    if (!company || !branch || !kiosk || !employee) throw new Error('missing fixtures');

    const shiftId = docId('SHIFT');
    await prisma.shiftType.create({
      data: {
        id: shiftId,
        shiftName: `Nuit smoke ${Date.now()}`,
        companyId: company.id,
        branchId: branch.id,
        startTime: new Date(Date.UTC(1970, 0, 1, 22, 0)),
        endTime: new Date(Date.UTC(1970, 0, 1, 6, 0)),
        lateGraceMinutes: 5,
        breakDurationMinutes: 60,
        weekDays: {
          create: [
            WeekDay.MONDAY,
            WeekDay.TUESDAY,
            WeekDay.WEDNESDAY,
            WeekDay.THURSDAY,
            WeekDay.FRIDAY,
            WeekDay.SATURDAY,
            WeekDay.SUNDAY,
          ].map((day, idx) => ({
            id: docId('SWD'),
            idx,
            day,
            startTime: '22:00',
            endTime: '06:00',
          })),
        },
      },
    });

    const workDate = new Date('2026-07-21T00:00:00.000Z');
    await prisma.shiftAssignment.create({
      data: {
        id: docId('SASN'),
        employeeId: employee.id,
        shiftTypeId: shiftId,
        companyId: company.id,
        startDate: workDate,
        endDate: workDate,
      },
    });

    await prisma.timeGateAttendanceEvent.deleteMany({
      where: {
        employeeId: employee.id,
        occurredAt: {
          gte: new Date('2026-07-21T00:00:00.000Z'),
          lte: new Date('2026-07-22T23:59:59.999Z'),
        },
      },
    });
    await prisma.timeGateTimesheetDay.deleteMany({
      where: {
        employeeId: employee.id,
        workDate: { gte: workDate, lte: new Date('2026-07-22T00:00:00.000Z') },
      },
    });

    const checkInAt = new Date('2026-07-21T21:15:00.000Z'); // 22:15 Africa/Brazzaville
    const checkOutAt = new Date('2026-07-22T05:30:00.000Z'); // 06:30 Africa/Brazzaville
    const stamp = Date.now();
    await prisma.timeGateAttendanceEvent.createMany({
      data: [
        {
          id: `EVT-ON-CI-${stamp}`,
          companyId: company.id,
          employeeId: employee.id,
          branchId: kiosk.branchId,
          kioskId: kiosk.id,
          type: 'CHECK_IN',
          status: 'ACCEPTED',
          occurredAt: checkInAt,
          source: 'MANUAL',
        },
        {
          id: `EVT-ON-CO-${stamp}`,
          companyId: company.id,
          employeeId: employee.id,
          branchId: kiosk.branchId,
          kioskId: kiosk.id,
          type: 'CHECK_OUT',
          status: 'ACCEPTED',
          occurredAt: checkOutAt,
          source: 'MANUAL',
        },
      ],
    });

    console.log('fixture employee', employee.id, 'shift', shiftId);

    const admin = await login('admin@sotrafer.cg', { sku: 'SOTR' });
    if (!admin) throw new Error('admin login failed');
    const auth = authHeader(admin);

    const recalc = await request('/timesheets/recalculate', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ from: '2026-07-21', to: '2026-07-22', employeeId: employee.id }),
    });
    console.log('recalculate', recalc.res.status, JSON.stringify(recalc.json));
    if (recalc.res.status >= 400) {
      process.exitCode = 1;
      return;
    }

    const sheets = await request(
      `/timesheets?page=1&limit=10&employeeId=${employee.id}&from=2026-07-21&to=2026-07-22`,
      { headers: auth },
    );
    const rows = (sheets.json?.data ?? []).map((r: any) => ({
      workDate: r.date ?? r.workDate,
      worked: r.workedMinutes,
      late: r.lateMinutes,
      ot: r.overtimeMinutes,
      status: r.status,
      flags: r.anomalyFlags,
      rule: r.ruleVersion,
    }));
    console.log('rows', rows);

    const d21 = rows.find((r: any) => String(r.workDate).startsWith('2026-07-21'));
    const d22 = rows.find((r: any) => String(r.workDate).startsWith('2026-07-22'));
    const flags = d21?.flags?.flags ?? d21?.flags ?? [];
    const unclosed = Array.isArray(flags) && flags.includes('UNCLOSED_CHECKIN');
    const ok = Boolean(
      d21 &&
        (d21.worked ?? 0) > 300 &&
        !unclosed &&
        (!d22 || (d22.worked ?? 0) < 60) &&
        (d21.late ?? 0) >= 5 &&
        (d21.late ?? 0) <= 20,
    );

    if (ok) {
      console.log('✅ PASS overnight timesheet pairing', {
        d21worked: d21!.worked,
        d22worked: d22?.worked ?? 0,
      });
    } else {
      console.log('❌ FAIL overnight timesheet pairing', { d21, d22 });
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
