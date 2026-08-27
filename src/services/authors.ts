import { http } from '@/lib/http'
import type { Author } from '@/types/api'

export function getAuthor(id: string): Promise<{ author: Author }> {
  return http.get<{ author: Author }>(`/api/authors/${encodeURIComponent(id)}`)
}
