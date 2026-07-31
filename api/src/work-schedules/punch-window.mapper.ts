import { formatTimeAsIso, toTimeOnlyDate } from '../common/utils/time.util';
import {
  parseHHmmToMinutes,
  shiftDurationMinutes,
  timeDateToMinutes,
} from '../common/utils/punch-time.util';
import { PunchWindowFieldsDto } from './dto/punch-window-fields.dto';

type BreakCurrent = {
  breakWindowStart?: Date | null;
  breakWindowEnd?: Date | null;
};

/** Durée de pause = fin − début (pause figée, pas une fenêtre flexible). */
export function breakDurationFromBounds(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
): number | null {
  if (start == null || end == null || start === '') return null;
  if (typeof end === 'string' && end === '') return null;
  const startMin =
    typeof start === 'string' ? parseHHmmToMinutes(start) : timeDateToMinutes(start);
  const endMin = typeof end === 'string' ? parseHHmmToMinutes(end) : timeDateToMinutes(end);
  if (startMin == null || endMin == null) return null;
  return shiftDurationMinutes(startMin, endMin);
}

export function mapPunchWindowFields(
  dto: PunchWindowFieldsDto,
  current?: BreakCurrent,
): Record<string, Date | number | null | undefined> {
  const mapped: Record<string, Date | number | null | undefined> = {};

  if (dto.checkInWindowStart !== undefined) {
    mapped.checkInWindowStart = dto.checkInWindowStart
      ? toTimeOnlyDate(dto.checkInWindowStart)
      : null;
  }
  if (dto.checkInWindowEnd !== undefined) {
    mapped.checkInWindowEnd = dto.checkInWindowEnd ? toTimeOnlyDate(dto.checkInWindowEnd) : null;
  }
  if (dto.checkOutWindowStart !== undefined) {
    mapped.checkOutWindowStart = dto.checkOutWindowStart
      ? toTimeOnlyDate(dto.checkOutWindowStart)
      : null;
  }
  if (dto.checkOutWindowEnd !== undefined) {
    mapped.checkOutWindowEnd = dto.checkOutWindowEnd
      ? toTimeOnlyDate(dto.checkOutWindowEnd)
      : null;
  }
  if (dto.breakWindowStart !== undefined) {
    mapped.breakWindowStart = dto.breakWindowStart
      ? toTimeOnlyDate(dto.breakWindowStart)
      : null;
  }
  if (dto.breakWindowEnd !== undefined) {
    mapped.breakWindowEnd = dto.breakWindowEnd ? toTimeOnlyDate(dto.breakWindowEnd) : null;
  }

  const nextStart =
    dto.breakWindowStart !== undefined
      ? (mapped.breakWindowStart as Date | null | undefined)
      : current?.breakWindowStart;
  const nextEnd =
    dto.breakWindowEnd !== undefined
      ? (mapped.breakWindowEnd as Date | null | undefined)
      : current?.breakWindowEnd;

  if (
    dto.breakWindowStart !== undefined ||
    dto.breakWindowEnd !== undefined ||
    dto.breakDurationMinutes !== undefined
  ) {
    mapped.breakDurationMinutes = breakDurationFromBounds(nextStart, nextEnd) ?? 0;
  }

  return mapped;
}

export function formatPunchWindows(row: {
  checkInWindowStart?: Date | null;
  checkInWindowEnd?: Date | null;
  checkOutWindowStart?: Date | null;
  checkOutWindowEnd?: Date | null;
  breakWindowStart?: Date | null;
  breakWindowEnd?: Date | null;
  breakDurationMinutes?: number | null;
}) {
  const derivedDuration = breakDurationFromBounds(row.breakWindowStart, row.breakWindowEnd);
  return {
    checkInWindowStart: row.checkInWindowStart
      ? formatTimeAsIso(row.checkInWindowStart)
      : null,
    checkInWindowEnd: row.checkInWindowEnd ? formatTimeAsIso(row.checkInWindowEnd) : null,
    checkOutWindowStart: row.checkOutWindowStart
      ? formatTimeAsIso(row.checkOutWindowStart)
      : null,
    checkOutWindowEnd: row.checkOutWindowEnd
      ? formatTimeAsIso(row.checkOutWindowEnd)
      : null,
    breakWindowStart: row.breakWindowStart ? formatTimeAsIso(row.breakWindowStart) : null,
    breakWindowEnd: row.breakWindowEnd ? formatTimeAsIso(row.breakWindowEnd) : null,
    breakDurationMinutes: derivedDuration ?? row.breakDurationMinutes ?? null,
  };
}
