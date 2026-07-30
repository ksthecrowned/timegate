/**
 * Backfill denormalized payroll run totals (totalBaseSalary, totalGross, totalNet,
 * linesCount/paidCount/unpaidCount, etc.) for TimeGatePayrollRun rows created before
 * these columns were populated by generateLines()/markLinesPaid().
 *
 * Uses the exact same aggregation helper (sumPayrollLineTotals) as the live service
 * code, so recomputed values match what a fresh run would have stored.
 *
 * Usage (run from the `api/` directory so Bun picks up `.env`):
 *   bun run scripts/backfill-payroll-totals.ts            # non-DRAFT runs only (default, matches spec)
 *   bun run scripts/backfill-payroll-totals.ts --all       # also recompute DRAFT runs
 *   bun run scripts/backfill-payroll-totals.ts --dry-run   # print what would change, write nothing
 *
 * Safety: this script only touches whichever database DATABASE_URL in your `.env`
 * points at. Double-check that value before running against anything but local/dev.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { sumPayrollLineTotals } from '../src/payroll-runs/payroll-run-totals.util';
import { toDecimal } from '../src/common/utils/money.util';

const DRY_RUN = process.argv.includes('--dry-run');
const INCLUDE_DRAFT = process.argv.includes('--all');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set (expected to be loaded from api/.env)');
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  console.log(`Target DB: ${connectionString.replace(/:[^:@/]+@/, ':***@')}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'WRITE'}; scope: ${INCLUDE_DRAFT ? 'ALL statuses' : 'non-DRAFT only'}\n`);

  try {
    const runs = await prisma.timeGatePayrollRun.findMany({
      where: INCLUDE_DRAFT ? {} : { status: { not: 'DRAFT' } },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });

    console.log(`Found ${runs.length} payroll run(s) to recompute.\n`);

    let updated = 0;
    let unchanged = 0;

    for (const run of runs) {
      const lines = await prisma.timeGatePayrollLine.findMany({
        where: { payrollRunId: run.id },
        select: {
          baseSalary: true,
          fixedAllowancesTotal: true,
          fixedDeductionsTotal: true,
          variableAllowancesTotal: true,
          variableDeductionsTotal: true,
          overtimeAmount: true,
          penaltyAmount: true,
          gross: true,
          netSalary: true,
          paymentStatus: true,
        },
      });

      const totals = sumPayrollLineTotals(lines);

      const changed =
        Number(run.totalBaseSalary) !== totals.totalBaseSalary ||
        Number(run.totalGross) !== totals.totalGross ||
        Number(run.totalNet) !== totals.totalNet ||
        run.linesCount !== totals.linesCount ||
        run.paidCount !== totals.paidCount ||
        run.unpaidCount !== totals.unpaidCount;

      if (!changed) {
        unchanged += 1;
        continue;
      }

      console.log(
        `${DRY_RUN ? '[dry-run] would update' : 'Updating'} run ${run.id} (${run.year}-${String(run.month).padStart(2, '0')}, ${run.status}): ` +
          `linesCount ${run.linesCount}->${totals.linesCount}, paidCount ${run.paidCount}->${totals.paidCount}, ` +
          `totalGross ${run.totalGross}->${totals.totalGross}, totalNet ${run.totalNet}->${totals.totalNet}`,
      );

      if (!DRY_RUN) {
        await prisma.timeGatePayrollRun.update({
          where: { id: run.id },
          data: {
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
      }

      updated += 1;
    }

    console.log(`\nDone. ${updated} run(s) ${DRY_RUN ? 'would be updated' : 'updated'}, ${unchanged} already correct.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
