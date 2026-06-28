import { formatTimeAsIso, toTimeOnlyDate } from '../common/utils/time.util';
import { PunchWindowFieldsDto } from './dto/punch-window-fields.dto';

export function mapPunchWindowFields(
  dto: PunchWindowFieldsDto,
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
  if (dto.breakDurationMinutes !== undefined) {
    mapped.breakDurationMinutes = dto.breakDurationMinutes;
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
    breakDurationMinutes: row.breakDurationMinutes ?? null,
  };
}
