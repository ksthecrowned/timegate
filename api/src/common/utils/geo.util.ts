/** Haversine distance in meters between two WGS84 coordinates. */
export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const DEFAULT_BRANCH_CHECKIN_RADIUS_M = 150;

export function isWithinBranchRadius(
  userLat: number,
  userLng: number,
  branchLat: number,
  branchLng: number,
  radiusMeters: number | null | undefined,
): boolean {
  const radius = radiusMeters ?? DEFAULT_BRANCH_CHECKIN_RADIUS_M;
  return distanceMeters(userLat, userLng, branchLat, branchLng) <= radius;
}
