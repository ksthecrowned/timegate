/**
 * Module-level cache for the /employee/me response.
 * Reduces redundant network calls when multiple screens load the profile
 * (home, more, profile, profile-edit). Invalidated on logout and on
 * explicit mutation.
 */

import { employeeApi } from './api';
import type { Profile } from './types';

let value: Profile | null = null;
let inflight: Promise<Profile> | null = null;

export async function getMeCached(): Promise<Profile> {
  if (value) return value;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const data = (await employeeApi.getMe()) as Profile;
      value = data;
      return data;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function invalidateMeCache(): void {
  value = null;
  inflight = null;
}

export function peekMeCache(): Profile | null {
  return value;
}