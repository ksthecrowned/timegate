import { http } from '@/lib/http'

export type CompanyUsage = {
  employees: number
  kiosks: number
  locations: number
  maxEmployees: number
  maxKiosks: number
  maxLocations: number
  capabilities: string[]
}

export type CompanyProfile = {
  id: string
  name: string | null
  sku: string | null
  abbr: string | null
  timeZone: string | null
  logoUrl: string | null
  phone: string | null
  email: string | null
  website: string | null
  address: string | null
  organizationSize: string | null
  industrySector: string | null
  expectedSiteCount: string | null
  workforceModel: string | null
  schedulePattern: string | null
  countryCode: string | null
  referralSource: string | null
  usage: CompanyUsage | null
  createdAt: string
  updatedAt: string
}

export type CompanyProfilePayload = {
  name?: string
  abbr?: string
  timeZone?: string
  logoUrl?: string
  phone?: string
  email?: string
  website?: string
  address?: string
  industrySector?: string | null
  expectedSiteCount?: string | null
  workforceModel?: string | null
  schedulePattern?: string | null
  countryCode?: string | null
  referralSource?: string | null
}

export function getMyCompany(): Promise<CompanyProfile> {
  return http.get<CompanyProfile>('/companies/me')
}

export function updateMyCompany(body: CompanyProfilePayload): Promise<CompanyProfile> {
  return http.patch<CompanyProfile>('/companies/me', body)
}

export function uploadCompanyLogo(file: File): Promise<CompanyProfile> {
  const body = new FormData()
  body.append('logo', file)
  return http.post<CompanyProfile>('/companies/me/logo', body)
}
