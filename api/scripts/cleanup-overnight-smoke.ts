/**
 * Remove overnight timesheet smoke fixtures created on SOTR
 * (shift names "Nuit smoke …", EVT-ON-* events, related assignments/timesheets).
 *
 * Usage (from api/):
 *   bun run scripts/cleanup-overnight-smoke.ts
 *   bun run scripts/cleanup-overnight-smoke.ts --dry-run
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL missing');

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  console.log(`Target DB: ${connectionString.replace(/:[^:@/]+@/, ':***@')}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'WRITE'}\n`);

  try {
    const company = await prisma.company.findFirst({
      where: { sku: 'SOTR' },
      select: { id: true },
    });
    if (!company) throw new Error('SOTR company not found');

    const smokeShifts = await prisma.shiftType.findMany({
      where: { companyId: company.id, shiftName: { contains: 'Nuit smoke' } },
      select: { id: true, shiftName: true },
    });
    const shiftIds = smokeShifts.map((s) => s.id);

    const smokeEvents = await prisma.timeGateAttendanceEvent.findMany({
      where: { companyId: company.id, id: { startsWith: 'EVT-ON-' } },
      select: { id: true, employeeId: true, occurredAt: true },
    });

    const assignments = shiftIds.length
      ? await prisma.shiftAssignment.findMany({
          where: { shiftTypeId: { in: shiftIds } },
          select: { id: true, employeeId: true },
        })
      : [];

    const employeeIds = [
      ...new Set([
        ...assignments.map((a) => a.employeeId),
        ...smokeEvents.map((e) => e.employeeId),
      ]),
    ];

    const workFrom = new Date('2026-07-21T00:00:00.000Z');
    const workTo = new Date('2026-07-22T00:00:00.000Z');
    const timesheetDays =
      employeeIds.length > 0
        ? await prisma.timeGateTimesheetDay.findMany({
            where: {
              companyId: company.id,
              employeeId: { in: employeeIds },
              workDate: { gte: workFrom, lte: workTo },
            },
            select: { id: true, employeeId: true, workDate: true },
          })
        : [];

    console.log(
      JSON.stringify(
        {
          smokeShifts: smokeShifts.length,
          assignments: assignments.length,
          smokeEvents: smokeEvents.length,
          timesheetDays: timesheetDays.length,
          shifts: smokeShifts,
        },
        null,
        2,
      ),
    );

    if (DRY_RUN) {
      console.log('\nDry run only — no deletes.');
      return;
    }

    if (smokeEvents.length) {
      const deletedEvents = await prisma.timeGateAttendanceEvent.deleteMany({
        where: { id: { in: smokeEvents.map((e) => e.id) } },
      });
      console.log(`Deleted events: ${deletedEvents.count}`);
    }

    if (timesheetDays.length) {
      const deletedSheets = await prisma.timeGateTimesheetDay.deleteMany({
        where: { id: { in: timesheetDays.map((d) => d.id) } },
      });
      console.log(`Deleted timesheet days: ${deletedSheets.count}`);
    }

    if (assignments.length) {
      const deletedAssigns = await prisma.shiftAssignment.deleteMany({
        where: { id: { in: assignments.map((a) => a.id) } },
      });
      console.log(`Deleted assignments: ${deletedAssigns.count}`);
    }

    if (shiftIds.length) {
      const deletedWeekDays = await prisma.shiftTypeWeekDay.deleteMany({
        where: { shiftTypeId: { in: shiftIds } },
      });
      console.log(`Deleted week days: ${deletedWeekDays.count}`);
      const deletedShifts = await prisma.shiftType.deleteMany({
        where: { id: { in: shiftIds } },
      });
      console.log(`Deleted smoke shifts: ${deletedShifts.count}`);
    }

    console.log('\n✅ Overnight smoke fixtures cleaned on SOTR.');
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
