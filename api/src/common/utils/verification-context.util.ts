export type VerificationContextGps = {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  capturedAt?: string | null;
} | null;

export type VerificationContext = {
  version: 1;
  employeeId: string;
  location: {
    id: string;
    name: string;
    type: string;
    clientLabel: string | null;
  } | null;
  mission: {
    id: string;
    title: string;
    publicSlug: string;
  } | null;
  kiosk: {
    id: string;
    name: string;
    channel: 'kiosk' | 'client_page';
  } | null;
  authMethod: string | null;
  device: {
    trustedDeviceId?: string | null;
  } | null;
  assignment: {
    id: string;
    locationId: string | null;
    shiftTypeId: string | null;
  } | null;
  shift: {
    id: string;
    name: string;
  } | null;
  timestamps: {
    occurredAt: string;
    recordedAt: string;
  };
  /** Stub for future complementary GPS — not product center in v1. */
  gps: VerificationContextGps;
  flags: {
    wrongSite?: boolean;
    lateAbsent?: boolean;
    assignmentExpired?: boolean;
    locationArchived?: boolean;
  };
};

export function extractVerificationContext(
  meta: unknown,
): VerificationContext | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  const ctx = (meta as Record<string, unknown>).verificationContext;
  if (!ctx || typeof ctx !== 'object' || Array.isArray(ctx)) return null;
  return ctx as VerificationContext;
}
