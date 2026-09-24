import type { PrismaClient } from '@prisma/client';
import { workDateUtcFromOccurredAt } from './punch-time.util';

type PrismaLike = Pick<PrismaClient, 'timeGateKiosk' | 'timeGateLocation' | 'shiftAssignment'>;

function coversDateKey(
  start: Date | null,
  end: Date | null,
  target: string,
): boolean {
  const s = start ? start.toISOString().slice(0, 10) : null;
  const e = end ? end.toISOString().slice(0, 10) : null;
  if (!s && !e) return true;
  if (s && !e) return target >= s;
  if (!s && e) return target <= e;
  return target >= s! && target <= e!;
}

async function resolveKioskLocationId(
  prisma: PrismaLike,
  kioskId: string,
  kioskBranchId: string,
): Promise<string | null> {
  const kiosk = await prisma.timeGateKiosk.findUnique({
    where: { id: kioskId },
    select: { locationId: true, branchId: true },
  });
  return (
    kiosk?.locationId ??
    (
      await prisma.timeGateLocation.findFirst({
        where: { branchId: kioskBranchId },
        select: { id: true },
      })
    )?.id ??
    null
  );
}

/**
 * Wrong site when kiosk location is not covered by an active presence assignment
 * (or home location fallback). Defaults to REVIEW via wrongSite flag (not hard reject).
 */
export async function isWrongSitePunch(
  prisma: PrismaLike,
  params: {
    employeeId: string;
    employeeHomeLocationId: string | null;
    employeeBranchId: string | null;
    kioskBranchId: string;
    kioskId: string;
    occurredAt: Date;
    /** Org timezone — required for correct day boundary (hardening P). */
    timeZone?: string;
  },
): Promise<boolean> {
  const kioskLocationId = await resolveKioskLocationId(
    prisma,
    params.kioskId,
    params.kioskBranchId,
  );

  if (!kioskLocationId) {
    return params.employeeBranchId != null && params.employeeBranchId !== params.kioskBranchId;
  }

  const day = params.timeZone
    ? workDateUtcFromOccurredAt(params.occurredAt, params.timeZone)
    : new Date(
        Date.UTC(
          params.occurredAt.getUTCFullYear(),
          params.occurredAt.getUTCMonth(),
          params.occurredAt.getUTCDate(),
        ),
      );
  const target = day.toISOString().slice(0, 10);

  const assignments = await prisma.shiftAssignment.findMany({
    where: { employeeId: params.employeeId },
    select: { locationId: true, startDate: true, endDate: true },
    orderBy: { startDate: 'desc' },
  });
  const covering = assignments.filter((row) =>
    coversDateKey(row.startDate, row.endDate, target),
  );

  const authorizedLocationIds = new Set(
    covering.map((row) => row.locationId).filter((id): id is string => !!id),
  );
  if (authorizedLocationIds.size === 0 && params.employeeHomeLocationId) {
    authorizedLocationIds.add(params.employeeHomeLocationId);
  }
  if (authorizedLocationIds.size === 0) {
    return params.employeeBranchId != null && params.employeeBranchId !== params.kioskBranchId;
  }
  return !authorizedLocationIds.has(kioskLocationId);
}

/**
 * Punch on an archived / inactive location → treat as REVIEW (hardening P).
 * Kiosks are also deactivated on archive; this covers race / QR / stale device.
 */
export async function isArchivedLocationPunch(
  prisma: PrismaLike,
  params: {
    kioskBranchId: string;
    kioskId: string;
  },
): Promise<boolean> {
  const kioskLocationId = await resolveKioskLocationId(
    prisma,
    params.kioskId,
    params.kioskBranchId,
  );
  if (!kioskLocationId) return false;
  const loc = await prisma.timeGateLocation.findUnique({
    where: { id: kioskLocationId },
    select: { isActive: true },
  });
  return loc != null && loc.isActive === false;
}

/**
 * Punch on a location whose assignment already ended (and nothing covers today) → REVIEW.
 */
export async function isExpiredAssignmentPunch(
  prisma: PrismaLike,
  params: {
    employeeId: string;
    kioskBranchId: string;
    kioskId: string;
    occurredAt: Date;
    timeZone?: string;
  },
): Promise<boolean> {
  const kioskLocationId = await resolveKioskLocationId(
    prisma,
    params.kioskId,
    params.kioskBranchId,
  );
  if (!kioskLocationId) return false;

  const day = params.timeZone
    ? workDateUtcFromOccurredAt(params.occurredAt, params.timeZone)
    : new Date(
        Date.UTC(
          params.occurredAt.getUTCFullYear(),
          params.occurredAt.getUTCMonth(),
          params.occurredAt.getUTCDate(),
        ),
      );
  const target = day.toISOString().slice(0, 10);

  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      employeeId: params.employeeId,
      locationId: kioskLocationId,
    },
    select: { startDate: true, endDate: true },
  });
  if (assignments.length === 0) return false;

  const covering = assignments.some((row) =>
    coversDateKey(row.startDate, row.endDate, target),
  );
  if (covering) return false;

  // Had an assignment on this location that already ended → expired
  return assignments.some((row) => {
    const e = row.endDate ? row.endDate.toISOString().slice(0, 10) : null;
    return e != null && e < target;
  });
}
