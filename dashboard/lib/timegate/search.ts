import { http } from '@/lib/http'

export type SearchResultItem = {
  id: string
  label: string
  href: string
  meta?: string | null
}

export type GlobalSearchResult = {
  q: string
  results: {
    employees: SearchResultItem[]
    branches: SearchResultItem[]
    departments: SearchResultItem[]
    designations: SearchResultItem[]
    kiosks: SearchResultItem[]
  }
}

export async function globalSearch(q: string, limit = 5) {
  return http.get<GlobalSearchResult>('/search', { params: { q, limit } })
}
