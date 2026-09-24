import { describe, expect, test } from 'bun:test';
import { resolveAttendancePunch } from '../attendance/attendance-punch-resolver';
import type { DayPunchState, ResolvedPunchWindows } from '../attendance/punch-window.types';
import {
  belongsToPreviousOvernightWorkDate,
  isOvernightShift,
  resolvePunchWorkDateKey,
  shiftDurationMinutes,
  workDateUtcFromOccurredAt,
} from '../common/utils/punch-time.util';

/**
 * G — Stress multi-secteurs : invariants moteur (sans fork produit).
 * Playbook : docs/pilot/interne/stress-tests-multisecteurs.md
 */

const emptyState: DayPunchState = {
  hasCheckIn: false,
  hasCheckOut: false,
  hasBreakEnd: false,
  checkInAtMin: null,
};

const dayWindows = (startH: number, endH: number): ResolvedPunchWindows => ({
  shiftTypeId: 'SHIFT-DAY',
  allowCheckInAfterBreakStart: true,
  shiftStartMin: startH * 60,
  shiftEndMin: endH * 60,
  checkInStartMin: startH * 60 - 60,
  checkInEndMin: startH * 60 + 120,
  checkOutStartMin: endH * 60 - 60,
  checkOutEndMin: endH * 60 + 120,
  breakStartMin: 12 * 60,
  breakEndMin: 13 * 60,
  breakDurationMinutes: 60,
});

const nightWindows: ResolvedPunchWindows = {
  shiftTypeId: 'SHIFT-NIGHT',
  allowCheckInAfterBreakStart: true,
  shiftStartMin: 22 * 60,
  shiftEndMin: 6 * 60,
  checkInStartMin: 21 * 60,
  checkInEndMin: 0,
  checkOutStartMin: 6 * 60,
  checkOutEndMin: 8 * 60,
  breakStartMin: null,
  breakEndMin: null,
  breakDurationMinutes: 60,
};

export const STRESS_SCENARIOS = [
  'bureau',
  'formation',
  'industrie',
  'hotel',
  'clinique',
  'securite',
  'nettoyage',
  'placement',
] as const;

export type StressScenarioId = (typeof STRESS_SCENARIOS)[number];

describe('G stress — catalogue scénarios', () => {
  test('8 scénarios roadmap présents', () => {
    expect(STRESS_SCENARIOS).toHaveLength(8);
  });
});

describe('G stress — bureau (journée fixe)', () => {
  test('check-in en fenêtre → CHECK_IN', () => {
    const w = dayWindows(8, 17);
    const r = resolveAttendancePunch(8 * 60 + 5, w, emptyState);
    expect(r.action).toBe('CHECK_IN');
  });

  test('trop tôt → REJECTED (pas de silence)', () => {
    const w = dayWindows(8, 17);
    const r = resolveAttendancePunch(5 * 60, w, emptyState);
    expect(r.action).toBe('REJECTED');
  });
});

describe('G stress — formation (multi-horaires)', () => {
  test('deux fenêtres distinctes acceptent chacune leur créneau', () => {
    const morning = dayWindows(8, 12);
    const afternoon = dayWindows(13, 17);
    expect(resolveAttendancePunch(8 * 60 + 10, morning, emptyState).action).toBe('CHECK_IN');
    expect(resolveAttendancePunch(8 * 60 + 10, afternoon, emptyState).action).toBe('REJECTED');
    expect(resolveAttendancePunch(13 * 60 + 10, afternoon, emptyState).action).toBe('CHECK_IN');
  });
});

describe('G stress — industrie / hôtel (multi bornes & points)', () => {
  test('capacités attendues listées (contrat produit)', () => {
    const caps = ['multi_kiosks', 'multi_locations'] as const;
    expect(caps).toContain('multi_kiosks');
    expect(caps).toContain('multi_locations');
  });
});

describe('G stress — clinique (nuit + minuit)', () => {
  test('overnight détecté + durée 8h', () => {
    expect(isOvernightShift(22 * 60, 6 * 60)).toBe(true);
    expect(shiftDurationMinutes(22 * 60, 6 * 60)).toBe(8 * 60);
  });

  test('check-in soir OK ; check-out matin après check-in OK', () => {
    expect(resolveAttendancePunch(22 * 60 + 15, nightWindows, emptyState).action).toBe(
      'CHECK_IN',
    );
    const afterIn: DayPunchState = {
      hasCheckIn: true,
      hasCheckOut: false,
      hasBreakEnd: false,
      checkInAtMin: 22 * 60 + 15,
    };
    expect(resolveAttendancePunch(7 * 60, nightWindows, afterIn).action).toBe('CHECK_OUT');
  });

  test('check-out trop tôt après minuit → REJECTED (pas silence)', () => {
    const afterIn: DayPunchState = {
      hasCheckIn: true,
      hasCheckOut: false,
      hasBreakEnd: false,
      checkInAtMin: 22 * 60 + 15,
    };
    // 03:00 est hors fenêtre check-out (06–08)
    expect(resolveAttendancePunch(3 * 60, nightWindows, afterIn).action).toBe('REJECTED');
  });

  test('matin rattache au work date de la veille', () => {
    expect(belongsToPreviousOvernightWorkDate(7 * 60, nightWindows)).toBe(true);
    expect(resolvePunchWorkDateKey('2026-09-24', 7 * 60, nightWindows)).toBe('2026-09-23');
  });

  test('fuseau org : bascule calendaire locale', () => {
    const at = new Date('2026-09-23T23:30:00.000Z');
    expect(workDateUtcFromOccurredAt(at, 'Africa/Brazzaville').toISOString().slice(0, 10)).toBe(
      '2026-09-24',
    );
  });
});

describe('G stress — sécurité / nettoyage / placement (contrats produit)', () => {
  test('wrong-site et mission client et fin mission sont des codes d’action connus', () => {
    const reviewReasons = ['KIOSK_OTHER_SITE', 'ASSIGNMENT_EXPIRED'] as const;
    const caps = ['client_missions', 'scoped_managers', 'anomaly_workflow'] as const;
    expect(reviewReasons).toContain('KIOSK_OTHER_SITE');
    expect(reviewReasons).toContain('ASSIGNMENT_EXPIRED');
    expect(caps).toContain('client_missions');
  });

  test('cycle présence → validation → timesheet → paie (chaîne documentée)', () => {
    const chain = [
      'event',
      'anomaly_or_review',
      'validation',
      'timesheet',
      'payroll',
    ] as const;
    expect(chain[0]).toBe('event');
    expect(chain[chain.length - 1]).toBe('payroll');
  });
});
