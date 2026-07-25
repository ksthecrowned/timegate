/**
 * Module-level cache for the /employee/me response.
 * Reduces redundant network calls when multiple screens load the profile
 * (home, more, profile, profile-edit). Invalidated on logout and on
 * explicit mutation.
 */

import { employeeApi } from './api';
import { setDeviceTrust } from './deviceInstallId';
import type { Profile } from './types';

let value: Profile | null = null;
let inflight: Promise<Profile> | null = null;

export async function getMeCached(options?: {
  force?: boolean;
}): Promise<Profile> {
  if (!options?.force && value) return value;
  if (!options?.force && inflight) return inflight;
  inflight = (async () => {
    try {
      const data = (await employeeApi.getMe()) as Profile;
      value = data;
      if (data.deviceTrust === 'TRUSTED' || data.deviceTrust === 'PENDING') {
        await setDeviceTrust(data.deviceTrust);
      }
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
