import { http } from '@/lib/http'

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
