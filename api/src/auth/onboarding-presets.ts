import { WeekDay } from '@prisma/client';
import type { IndustrySector, SchedulePattern } from './dto/signup.dto';

export type PresetShiftDef = {
  name: string;
  start: string; // HH:mm
  end: string;
  weekdays: WeekDay[];
};

export type OnboardingPreset = {
  departments: { name: string; code: string }[];
  shifts: PresetShiftDef[];
};

const WEEKDAYS: WeekDay[] = [
  WeekDay.MONDAY,
  WeekDay.TUESDAY,
  WeekDay.WEDNESDAY,
  WeekDay.THURSDAY,
  WeekDay.FRIDAY,
];

const ALL_DAYS: WeekDay[] = [
  ...WEEKDAYS,
  WeekDay.SATURDAY,
  WeekDay.SUNDAY,
];

const DAY: PresetShiftDef = {
  name: 'Journée standard',
  start: '08:00',
  end: '17:00',
  weekdays: WEEKDAYS,
};

const AFTERNOON: PresetShiftDef = {
  name: 'Après-midi',
  start: '14:00',
  end: '22:00',
  weekdays: WEEKDAYS,
};

const NIGHT: PresetShiftDef = {
  name: 'Nuit',
  start: '22:00',
  end: '06:00',
  weekdays: ALL_DAYS,
};

const MORNING: PresetShiftDef = {
  name: 'Matin',
  start: '06:00',
  end: '14:00',
  weekdays: WEEKDAYS,
};

const SECTOR_DEPTS: Record<IndustrySector, { name: string; code: string }[]> = {
  OFFICE: [
    { name: 'Administration', code: 'ADM' },
    { name: 'Ressources humaines', code: 'RH' },
  ],
  TRAINING: [
    { name: 'Pédagogie', code: 'PED' },
    { name: 'Administration', code: 'ADM' },
  ],
  INDUSTRY: [
    { name: 'Production', code: 'PROD' },
    { name: 'Maintenance', code: 'MAIN' },
  ],
  SECURITY: [
    { name: 'Terrain', code: 'TER' },
    { name: 'Supervision', code: 'SUP' },
  ],
  CLEANING: [
    { name: 'Opérations', code: 'OPS' },
    { name: 'Coordination', code: 'COO' },
  ],
  STAFFING: [
    { name: 'Placement', code: 'PLC' },
    { name: 'Administration', code: 'ADM' },
  ],
  CLINIC: [
    { name: 'Soins', code: 'SOI' },
    { name: 'Administration', code: 'ADM' },
  ],
  HOTEL: [
    { name: 'Réception', code: 'REC' },
    { name: 'Housekeeping', code: 'HSK' },
  ],
  OTHER: [{ name: 'Général', code: 'GEN' }],
};

/**
 * One-shot onboarding presets from org profile — never a permanent sector mode.
 */
export function resolveOnboardingPreset(params: {
  industrySector?: IndustrySector | null;
  schedulePattern?: SchedulePattern | null;
}): OnboardingPreset {
  const sector = params.industrySector ?? 'OTHER';
  const pattern = params.schedulePattern ?? 'fixed_day';
  const departments = SECTOR_DEPTS[sector] ?? SECTOR_DEPTS.OTHER;

  let shifts: PresetShiftDef[];
  if (pattern === 'includes_night') {
    shifts = [DAY, NIGHT];
  } else if (pattern === 'multi_shift') {
    shifts = [MORNING, AFTERNOON];
  } else {
    shifts = [DAY];
  }

  // Clinic / security / hotel benefit from night even if pattern omitted as fixed_day
  // only when explicitly includes_night or multi — keep simple: trust schedulePattern.

  return { departments, shifts };
}

/** Parse HH:mm → Date used as TIME in Postgres (epoch day). */
export function timeOfDay(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map((n) => Number(n));
  return new Date(Date.UTC(1970, 0, 1, h || 0, m || 0, 0));
}
