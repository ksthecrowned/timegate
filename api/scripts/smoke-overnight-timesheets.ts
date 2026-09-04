/**
 * Smoke: recalculate timesheets and verify overnight IN/OUT share one workDate.
 * Run from api/: bun run scripts/smoke-overnight-timesheets.ts
 */
import { PrismaClient, TimeGateAttendanceEventStatus, TimeGateAttendanceEventType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { login, request, authHeader } from './test/helpers.mjs';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL missing');
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const company = await prisma.company.findFirst({
      where: { sku: 'SOTR' },
      select: { id: true, timeZone: true, name: true },
    });
    if (!company) throw new Error('Company SOTR not found');
    console.log('company', company.name, company.timeZone);

    // Find evening CHECK_IN + morning CHECK_OUT pairs within ~16h for same employee
    const checkIns = await prisma.timeGateAttendanceEvent.findMany({
      where: {
        companyId: company.id,
        type: TimeGateAttendanceEventType.CHECK_IN,
        status: TimeGateAttendanceEventStatus.ACCEPTED,
        employeeId: { not: null },
        occurredAt: { gte: new Date('2026-01-01T00:00:00.000Z') },
      },
      select: { id: true, employeeId: true, occurredAt: true },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });

    let pair = null;
    for (const ci of checkIns) {
      const hour = Number(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: company.timeZone || 'Africa/Brazzaville',
          hour: '2-digit',
          hour12: false,
        }).format(ci.occurredAt),
      );
      if (hour < 18) continue;
      const nextMorning = new Date(ci.occurredAt.getTime() + 16 * 3600_000);
      const co = await prisma.timeGateAttendanceEvent.findFirst({
        where: {
          employeeId: ci.employeeId!,
          type: TimeGateAttendanceEventType.CHECK_OUT,
          status: TimeGateAttendanceEventStatus.ACCEPTED,
          occurredAt: { gt: ci.occurredAt, lte: nextMorning },
        },
        select: { id: true, occurredAt: true },
      });
      if (!co) continue;
      const coHour = Number(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: company.timeZone || 'Africa/Brazzaville',
          hour: '2-digit',
          hour12: false,
        }).format(co.occurredAt),
      );
      if (coHour > 12) continue;
      pair = { employeeId: ci.employeeId, checkIn: ci.occurredAt, checkOut: co.occurredAt };
      break;
    }

    const admin = await login('admin@sotrafer.cg', { sku: 'SOTR' });
    if (!admin) throw new Error('admin login failed');
    const auth = authHeader(admin);

    if (!pair) {
      console.log('ℹ️ No overnight punch pair found in DB — seeding synthetic events for one employee');
      const employee = await prisma.employee.findFirst({
        where: { companyId: company.id, status: 'ACTIVE' },
        select: { id: true, employeeName: true, firstName: true, lastName: true },
      });
      if (!employee) throw new Error('No active employee');
      // Work date 2026-07-28 Brazzaville: CI 22:15 local (=21:15Z), CO 06:30 next (=05:30Z)
      const checkInAt = new Date('2026-07-28T21:15:00.000Z');
      const checkOutAt = new Date('2026-07-29T05:30:00.000Z');
      const branch = await prisma.branch.findFirst({
        where: { companyId: company.id },
        select: { id: true },
      });
      const kiosk = await prisma.timeGateKiosk.findFirst({
        where: { companyId: company.id },
        select: { id: true, branchId: true },
      });
      if (!branch || !kiosk) throw new Error('Need branch+kiosk to seed attendance events');
      const stamp = Date.now();
      await prisma.timeGateAttendanceEvent.createMany({
        data: [
          {
            id: `EVT-SMOKE-CI-${stamp}`,
            companyId: company.id,
            employeeId: employee.id,
            branchId: kiosk.branchId,
            kioskId: kiosk.id,
            type: TimeGateAttendanceEventType.CHECK_IN,
            status: TimeGateAttendanceEventStatus.ACCEPTED,
            occurredAt: checkInAt,
            source: 'MANUAL',
          },
          {
            id: `EVT-SMOKE-CO-${stamp}`,
            companyId: company.id,
            employeeId: employee.id,
            branchId: kiosk.branchId,
            kioskId: kiosk.id,
            type: TimeGateAttendanceEventType.CHECK_OUT,
            status: TimeGateAttendanceEventStatus.ACCEPTED,
            occurredAt: checkOutAt,
            source: 'MANUAL',
          },
        ],
      });
      pair = { employeeId: employee.id, checkIn: checkInAt, checkOut: checkOutAt, seeded: true };
      console.log('✅ seeded pair for', employee.id, checkInAt.toISOString(), '→', checkOutAt.toISOString());
    } else {
      console.log('✅ found overnight pair', pair.employeeId, pair.checkIn.toISOString(), '→', pair.checkOut.toISOString());
    }

    const from = '2026-07-28';
    const to = '2026-07-29';
    const recalc = await request('/timesheets/recalculate', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ from, to, employeeId: pair.employeeId }),
    });
    if (recalc.res.status !== 200 && recalc.res.status !== 201) {
      console.log('❌ recalculate', recalc.res.status, JSON.stringify(recalc.json)?.slice(0, 400));
      process.exitCode = 1;
      return;
    }
    console.log('✅ recalculate', JSON.stringify(recalc.json));

    const sheets = await request(
      `/timesheets?page=1&limit=20&employeeId=${pair.employeeId}&from=${from}&to=${to}`,
      { headers: auth },
    );
    if (sheets.res.status !== 200) {
      console.log('❌ timesheets list', sheets.res.status);
      process.exitCode = 1;
      return;
    }
    const rows = sheets.json?.data ?? [];
    console.log(
      'timesheet rows',
      rows.map((r) => ({
        workDate: r.workDate ?? r.date,
        worked: r.workedMinutes,
        late: r.lateMinutes,
        ot: r.overtimeMinutes,
        status: r.status,
        flags: r.anomalyFlags,
        rule: r.ruleVersion,
      })),
    );

    const workDay = rows.find((r) => String(r.workDate ?? r.date).startsWith('2026-07-28'));
    const nextDay = rows.find((r) => String(r.workDate ?? r.date).startsWith('2026-07-29'));
    if (!workDay) {
      console.log('❌ missing timesheet for work date 2026-07-28');
      process.exitCode = 1;
      return;
    }
    if ((workDay.workedMinutes ?? 0) <= 0) {
      console.log('❌ workedMinutes still 0 on overnight work date', workDay);
      process.exitCode = 1;
      return;
    }
    // Morning day should not own the full span alone as the only worked day with CI
    console.log('✅ overnight work date has workedMinutes=', workDay.workedMinutes);
    if (nextDay && (nextDay.workedMinutes ?? 0) > (workDay.workedMinutes ?? 0)) {
      console.log('⚠️ next calendar day has higher workedMinutes — possible split still', nextDay.workedMinutes);
    } else {
      console.log('✅ pairing looks centered on work date (next day worked=', nextDay?.workedMinutes ?? 0, ')');
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
