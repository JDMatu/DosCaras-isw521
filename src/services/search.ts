import { http } from '@/lib/http'
import type { SearchResponse } from '@/types/api'

export function search(q: string): Promise<SearchResponse> {
  return http.get<SearchResponse>('/api/search', { query: { q } })
}
