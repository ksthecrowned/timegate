import type { PaginatedResponse } from '@/lib/http/types'

/** Récupère toutes les pages d’une liste paginée API (limit max 100). */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<PaginatedResponse<T>>,
  maxPages = 50,
): Promise<T[]> {
  const items: T[] = []
  let page = 1

  while (page <= maxPages) {
    const res = await fetchPage(page)
    items.push(...res.data)
    if (items.length >= res.meta.total || res.data.length === 0) break
    page += 1
  }

  return items
}
