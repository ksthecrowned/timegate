import { http } from '@/lib/http'

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

export function getPlatformStats(): Promise<PlatformStats> {
  return http.get<PlatformStats>('/admin-saas/platform-stats')
}
