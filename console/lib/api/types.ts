export type TimeGateRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'EMPLOYEE'

export type TimeGateUser = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  role: TimeGateRole
  companyId: string | null
}

export type LoginResponse = {
  access_token: string
}

export type ActivationKeyResult = {
  id: string
  companyId: string
  plan: string
  maxEmployees: number
  maxKiosks: number
  expiresAt: string
  createdAt: string
  activationKey: string
}

export type AuditLog = {
  id: string
  companyId: string
  userId?: string | null
  action: string
  entity: string
  entityId?: string | null
  createdAt: string
  user?: { id: string; email: string; role?: string | null } | null
  company?: { id: string; name: string; sku?: string } | null
}

export type Subscription = {
  id: string
  companyId: string
  plan: string
  maxEmployees: number
  maxKiosks: number
  expiresAt: string
  createdAt: string
  company?: { id: string; name: string; sku?: string } | null
}

export type Country = {
  id: string
  name: string
  isoCode: string
  phoneCode?: string | null
  createdAt: string
  updatedAt: string
}

export type City = {
  id: string
  name: string
  countryId: string
  latitude?: number | null
  longitude?: number | null
  country?: { id: string; name: string; isoCode: string }
  createdAt: string
  updatedAt: string
}

export type SubscriptionPlan = {
  id: string
  code: string
  label: string
  maxEmployees: number
  maxKiosks: number
  durationDays: number | null
  features: Record<string, unknown> | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type PlatformSettings = {
  id: string
  trialDays: number
  trialMaxEmployees: number
  trialMaxKiosks: number
  gracePeriodDays: number
  updatedAt: string
}

export type SystemConfig = {
  id: string
  companyId: string
  minConfidence: number
  lateThreshold: number
  veryLateThreshold: number
  company?: { id: string; name: string; sku?: string } | null
}

export type OrganizationSubscription = {
  id: string
  plan: string
  maxEmployees: number
  maxKiosks: number
  maxDevices: number
  expiresAt: string | null
}

export type OrganizationUser = {
  id: string
  email: string
  role: string
  createdAt: string
}

export type OrganizationActivationKey = {
  id: string
  plan: string
  expiresAt: string | null
  usedAt: string | null
  revokedAt: string | null
  createdAt: string
}

export type Organization = {
  id: string
  name: string
  sku: string
  suspendedAt?: string | null
  createdAt: string
  updatedAt?: string
  subscriptions?: OrganizationSubscription[]
  users?: OrganizationUser[]
  activationKeys?: OrganizationActivationKey[]
}

export type PlatformStatsOrganization = {
  companyId: string
  name: string
  sku: string
  employeeCount: number
  branchCount: number
  kioskCount: number
  subscriptionPlan: string | null
  subscriptionActive: boolean
}

export type PlatformStats = {
  summary: {
    organizationCount: number
    activeSubscriptions: number
    expiredSubscriptions: number
    attendanceEventsLast30Days: number
  }
  organizations: PlatformStatsOrganization[]
}
