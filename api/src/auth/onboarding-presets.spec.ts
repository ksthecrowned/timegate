import { describe, expect, test } from 'bun:test';
import { resolveOnboardingPreset, timeOfDay } from '../auth/onboarding-presets';

describe('P — onboarding presets', () => {
  test('défaut = Général + journée', () => {
    const p = resolveOnboardingPreset({});
    expect(p.departments[0]?.code).toBe('GEN');
    expect(p.shifts).toHaveLength(1);
    expect(p.shifts[0]?.name).toBe('Journée standard');
  });

  test('clinique + nuit → 2 horaires', () => {
    const p = resolveOnboardingPreset({
      industrySector: 'CLINIC',
      schedulePattern: 'includes_night',
    });
    expect(p.departments.map((d) => d.code)).toEqual(['SOI', 'ADM']);
    expect(p.shifts.map((s) => s.name)).toEqual(['Journée standard', 'Nuit']);
  });

  test('multi_shift → matin + après-midi', () => {
    const p = resolveOnboardingPreset({
      industrySector: 'HOTEL',
      schedulePattern: 'multi_shift',
    });
    expect(p.shifts).toHaveLength(2);
    expect(p.shifts[0]?.start).toBe('06:00');
  });

  test('timeOfDay epoch', () => {
    expect(timeOfDay('08:30').toISOString()).toBe('1970-01-01T08:30:00.000Z');
  });
});
