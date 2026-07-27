/** JWT / @Roles marker for the platform `Admin` entity (not a tenant User role). */
export const PLATFORM_ADMIN = 'PLATFORM_ADMIN' as const;

export type PlatformAdminRole = typeof PLATFORM_ADMIN;
