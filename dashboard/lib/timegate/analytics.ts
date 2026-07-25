import { http } from '@/lib/http'

export type AnalyticsFunnelResponse = {
  days: number
  since: string
  events: Record<string, { total: number; uniqueUsers: number }>
  conversion: {
    loginToQr: number | null
    loginToLeave: number | null
    qrToLeave: number | null
  }
  daily: Array<{ date: string; login: number; qr: number; leave: number }>
}

export function getAnalyticsFunnel(days = 30) {
  return http.get<AnalyticsFunnelResponse>('/analytics/funnel', {
    params: { days },
  })
}
