import { PrismaService } from '../../prisma/prisma.service';

function toUtcDateOnly(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function isAssignmentActiveOn(
  startDate: Date | null,
  endDate: Date | null,
  day: Date,
): boolean {
  const target = toUtcDateOnly(day);
  if (startDate && toUtcDateOnly(startDate) > target) return false;
  if (endDate && toUtcDateOnly(endDate) < target) return false;
  return true;
}

/**
 * Employees with an active shift assignment for the kiosk branch may verify.
 * Shift locations are deprecated; branch is the geo source of truth.
 */
export async function resolveKioskEligibleEmployeeIds(
  prisma: PrismaService,
  kiosk: { branchId: string; shiftLocationId?: string | null },
  onDate: Date = new Date(),
): Promise<string[] | null> {
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      OR: [
        ...(kiosk.shiftLocationId ? [{ shiftLocationId: kiosk.shiftLocationId }] : []),
        {
          employee: { branchId: kiosk.branchId },
        },
      ],
    },
    select: { employeeId: true, startDate: true, endDate: true },
  });

  if (assignments.length === 0) return null;

  const ids = [
    ...new Set(
      assignments
        .filter((row) => isAssignmentActiveOn(row.startDate, row.endDate, onDate))
        .map((row) => row.employeeId),
    ),
  ];
  return ids.length > 0 ? ids : null;
}
