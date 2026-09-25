/**
 * Purge fixtures créées par test:use-cases sur une base (souvent preprod polluée).
 *
 * Usage (depuis api/) :
 *   bun run scripts/cleanup-uc-pollution.ts --dry-run
 *   bun run scripts/cleanup-uc-pollution.ts --confirm
 *
 * Par défaut lit DATABASE_URL (api/.env). Pour cibler Explicitement :
 *   DATABASE_URL=… bun run scripts/cleanup-uc-pollution.ts --confirm
 *
 * Ne touche PAS aux comptes seed @sotrafer.cg (sauf rollback nom Admin/Test).
 */
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const DRY_RUN = process.argv.includes('--dry-run') || !process.argv.includes('--confirm');
const CONFIRM = process.argv.includes('--confirm');

function maskUrl(url: string): string {
  return url.replace(/:[^:@/]+@/, ':***@');
}

function isUcEmployeeEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  if (e.endsWith('@tenant-test.example')) return true;
  if (e.endsWith('@test.com')) {
    return (
      e.startsWith('e2e.') ||
      e.startsWith('stress.') ||
      e.startsWith('dup.') ||
      e.startsWith('admin.a.') ||
      e.startsWith('admin.b.')
    );
  }
  if (e.endsWith('@example.com') && e.startsWith('test.uc.')) return true;
  return false;
}

async function deleteEmployeeCascade(
  prisma: PrismaClient,
  employeeId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.timeGateShiftSwapRequest.deleteMany({
      where: { OR: [{ requesterEmployeeId: employeeId }, { targetEmployeeId: employeeId }] },
    });
    await tx.timeGatePunchClaim.deleteMany({ where: { employeeId } });
    await tx.timeGateAttendanceEvent.deleteMany({ where: { employeeId } });
    await tx.timeGateLateRecord.deleteMany({ where: { employeeId } });
    await tx.timeGateAbsenceRecord.deleteMany({ where: { employeeId } });
    await tx.timeGateTimesheetDay.deleteMany({ where: { employeeId } });
    await tx.timeGateEmployeeContract.deleteMany({ where: { employeeId } });
    await tx.faceRecognitionLog.deleteMany({ where: { employeeId } });
    await tx.employeeCheckin.deleteMany({ where: { employeeId } });
    await tx.attendance.deleteMany({ where: { employeeId } });
    await tx.leaveApplication.deleteMany({ where: { employeeId } });
    await tx.leaveAllocation.deleteMany({ where: { employeeId } });
    await tx.shiftAssignment.deleteMany({ where: { employeeId } });
    await tx.employeeCompensationItem.deleteMany({ where: { employeeId } });
    await tx.salaryAdvance.deleteMany({ where: { employeeId } });
    await tx.timeGatePayrollLine.deleteMany({ where: { employeeId } });
    await tx.payrollVariableItem.deleteMany({ where: { employeeId } });
    await tx.timesheet.deleteMany({ where: { employeeId } });
    await tx.salarySlip.deleteMany({ where: { employeeId } });
    const emp = await tx.employee.findUnique({
      where: { id: employeeId },
      select: { userId: true },
    });
    await tx.employee.update({ where: { id: employeeId }, data: { userId: null } });
    await tx.employee.delete({ where: { id: employeeId } });
    if (emp?.userId) {
      await tx.timeGateTrustedDevice.deleteMany({ where: { userId: emp.userId } });
      try {
        await tx.user.delete({ where: { id: emp.userId } });
      } catch {
        // user may still be referenced elsewhere
      }
    }
  });
}

async function wipeCompany(prisma: PrismaClient, companyId: string): Promise<void> {
  const employees = await prisma.employee.findMany({
    where: { companyId },
    select: { id: true },
  });
  for (const e of employees) {
    await deleteEmployeeCascade(prisma, e.id);
  }

  await prisma.$transaction(async (tx) => {
    await tx.timeGateKiosk.deleteMany({ where: { companyId } });
    await tx.timeGateAttendanceEvent.deleteMany({ where: { companyId } });
    await tx.timeGateTimesheetDay.deleteMany({ where: { companyId } });
    await tx.timeGatePayrollRun.deleteMany({ where: { companyId } });
    await tx.payGroup.deleteMany({ where: { companyId } });
    await tx.shiftType.deleteMany({ where: { companyId } });
    await tx.department.deleteMany({ where: { companyId } });
    await tx.designation.deleteMany({ where: { companyId } });
    await tx.employmentType.deleteMany({ where: { companyId } });
    await tx.leaveType.deleteMany({ where: { companyId } });
    await tx.holidayList.deleteMany({ where: { companyId } });
    await tx.branch.deleteMany({ where: { companyId } });
    await tx.timeGateSubscription.deleteMany({ where: { companyId } });
    await tx.timeGateSystemSettings.deleteMany({ where: { companyId } });
    await tx.timeGateNotification.deleteMany({ where: { companyId } });
    await tx.timeGateNotificationRule.deleteMany({ where: { companyId } });
    await tx.timeGateAuditLog.deleteMany({ where: { companyId } });
    await tx.timeGateConversation.deleteMany({ where: { companyId } });
    await tx.compensationGrid.deleteMany({ where: { companyId } });
    await tx.user.deleteMany({ where: { companyId } });
    await tx.company.delete({ where: { id: companyId } });
  });
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL missing');

  if (!CONFIRM && !process.argv.includes('--dry-run')) {
    console.log('Mode dry-run par défaut. Passez --confirm pour écrire.\n');
  }
  if (CONFIRM && DRY_RUN) {
    // --confirm wins
  }

  const doWrite = CONFIRM;
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  console.log(`Target DB: ${maskUrl(connectionString)}`);
  console.log(`Mode: ${doWrite ? 'WRITE (--confirm)' : 'DRY RUN'}\n`);

  try {
    const pollutingCompanies = await prisma.company.findMany({
      where: {
        OR: [
          { name: { startsWith: 'Tenant A ' } },
          { name: { startsWith: 'Tenant B ' } },
          { name: { startsWith: 'Dup ' } },
        ],
      },
      select: { id: true, name: true, sku: true },
    });

    const tenantUsers = await prisma.user.findMany({
      where: { email: { endsWith: '@tenant-test.example' } },
      select: { id: true, email: true, companyId: true },
    });

    const companyIdsFromUsers = [
      ...new Set(tenantUsers.map((u) => u.companyId).filter(Boolean) as string[]),
    ];
    const extraCompanies = companyIdsFromUsers.length
      ? await prisma.company.findMany({
          where: {
            id: { in: companyIdsFromUsers },
            NOT: { sku: 'SOTR' },
          },
          select: { id: true, name: true, sku: true },
        })
      : [];

    const companiesToWipe = new Map<string, { id: string; name: string | null; sku: string | null }>();
    for (const c of [...pollutingCompanies, ...extraCompanies]) {
      companiesToWipe.set(c.id, c);
    }

    const allEmployees = await prisma.employee.findMany({
      select: {
        id: true,
        companyId: true,
        firstName: true,
        lastName: true,
        personalEmail: true,
        user: { select: { email: true } },
      },
    });
    const ucEmployees = allEmployees.filter(
      (e) =>
        isUcEmployeeEmail(e.personalEmail) || isUcEmployeeEmail(e.user?.email),
    );

    const sotr = await prisma.company.findFirst({
      where: { sku: 'SOTR' },
      select: { id: true },
    });

    const sotrBranches = sotr
      ? await prisma.branch.findMany({
          where: {
            companyId: sotr.id,
            OR: [
              { branchName: { startsWith: 'Site Test ' } },
              { branchName: { startsWith: 'E2E Branch ' } },
            ],
          },
          select: { id: true, branchName: true },
        })
      : [];

    const sotrDepartments = sotr
      ? await prisma.department.findMany({
          where: { companyId: sotr.id, departmentName: { startsWith: 'Finance ' } },
          select: { id: true, departmentName: true },
        })
      : [];

    const sotrDesignations = sotr
      ? await prisma.designation.findMany({
          where: { companyId: sotr.id, designationName: { startsWith: 'Analyste ' } },
          select: { id: true, designationName: true },
        })
      : [];

    const sotrShifts = sotr
      ? await prisma.shiftType.findMany({
          where: {
            companyId: sotr.id,
            OR: [
              { shiftName: { startsWith: 'E2E Horaire ' } },
              { shiftName: { startsWith: 'UC20-' } },
              { shiftName: { contains: 'Nuit smoke' } },
            ],
          },
          select: { id: true, shiftName: true },
        })
      : [];

    const sotrPayGroups = sotr
      ? await prisma.payGroup.findMany({
          where: { companyId: sotr.id, name: { startsWith: 'UC-07 Groupe ' } },
          select: { id: true, name: true },
        })
      : [];

    const testCountries = await prisma.country.findMany({
      where: { name: { startsWith: 'Test Country ' } },
      select: { id: true, name: true, isoCode: true },
    });

    const patchedAdmins = await prisma.user.findMany({
      where: {
        email: 'admin@sotrafer.cg',
        firstName: 'Admin',
        lastName: 'Test',
      },
      select: { id: true, email: true },
    });

    console.log(
      JSON.stringify(
        {
          companiesToWipe: [...companiesToWipe.values()],
          tenantUsers: tenantUsers.length,
          ucEmployees: ucEmployees.map((e) => ({
            id: e.id,
            email: e.personalEmail ?? e.user?.email,
            name: `${e.firstName} ${e.lastName}`,
          })),
          sotrBranches,
          sotrDepartments,
          sotrDesignations,
          sotrShifts,
          sotrPayGroups,
          testCountries,
          patchedAdmins,
        },
        null,
        2,
      ),
    );

    if (!doWrite) {
      console.log('\nDry run only — relancer avec --confirm pour supprimer.');
      return;
    }

    let deletedEmployees = 0;
    for (const e of ucEmployees) {
      // Skip employees belonging to companies we will wipe entirely
      if (companiesToWipe.has(e.companyId)) continue;
      try {
        await deleteEmployeeCascade(prisma, e.id);
        deletedEmployees += 1;
        console.log(`Deleted employee ${e.id} (${e.personalEmail ?? e.user?.email})`);
      } catch (err) {
        console.error(`Failed employee ${e.id}:`, (err as Error).message);
      }
    }

    for (const c of companiesToWipe.values()) {
      try {
        await wipeCompany(prisma, c.id);
        console.log(`Wiped company ${c.id} (${c.name})`);
      } catch (err) {
        console.error(`Failed company ${c.id}:`, (err as Error).message);
      }
    }

    if (sotrBranches.length) {
      const ids = sotrBranches.map((b) => b.id);
      await prisma.timeGateKiosk.deleteMany({ where: { branchId: { in: ids } } });
      await prisma.timeGateLocation
        .deleteMany({ where: { branchId: { in: ids } } })
        .catch(() => undefined);
      const r = await prisma.branch.deleteMany({ where: { id: { in: ids } } });
      console.log(`Deleted SOTR branches: ${r.count}`);
    }

    if (sotrDepartments.length) {
      await prisma.employee.updateMany({
        where: { departmentId: { in: sotrDepartments.map((d) => d.id) } },
        data: { departmentId: null },
      });
      const r = await prisma.department.deleteMany({
        where: { id: { in: sotrDepartments.map((d) => d.id) } },
      });
      console.log(`Deleted SOTR departments: ${r.count}`);
    }

    if (sotrDesignations.length) {
      await prisma.employee.updateMany({
        where: { designationId: { in: sotrDesignations.map((d) => d.id) } },
        data: { designationId: null },
      });
      const r = await prisma.designation.deleteMany({
        where: { id: { in: sotrDesignations.map((d) => d.id) } },
      });
      console.log(`Deleted SOTR designations: ${r.count}`);
    }

    if (sotrShifts.length) {
      const ids = sotrShifts.map((s) => s.id);
      await prisma.shiftAssignment.deleteMany({ where: { shiftTypeId: { in: ids } } });
      await prisma.shiftTypeWeekDay.deleteMany({ where: { shiftTypeId: { in: ids } } });
      const r = await prisma.shiftType.deleteMany({ where: { id: { in: ids } } });
      console.log(`Deleted SOTR UC shifts: ${r.count}`);
    }

    if (sotrPayGroups.length) {
      await prisma.employee.updateMany({
        where: { payGroupId: { in: sotrPayGroups.map((p) => p.id) } },
        data: { payGroupId: null },
      });
      const r = await prisma.payGroup.deleteMany({
        where: { id: { in: sotrPayGroups.map((p) => p.id) } },
      });
      console.log(`Deleted SOTR UC pay groups: ${r.count}`);
    }

    for (const country of testCountries) {
      await prisma.city.deleteMany({ where: { countryId: country.id } });
      await prisma.country.delete({ where: { id: country.id } }).catch(() => undefined);
      console.log(`Deleted country ${country.name}`);
    }

    if (patchedAdmins.length) {
      const r = await prisma.user.updateMany({
        where: { id: { in: patchedAdmins.map((u) => u.id) } },
        data: { firstName: 'Admin', lastName: 'Sotrafer' },
      });
      console.log(`Reset admin display name: ${r.count}`);
    }

    console.log(`\n✅ Cleanup done (employees hors tenants: ${deletedEmployees}).`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
