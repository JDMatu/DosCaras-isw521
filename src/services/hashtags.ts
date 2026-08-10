import { http } from '@/lib/http'
import type { Hashtag } from '@/types/api'

export function listHashtags(q?: string): Promise<{ hashtags: Hashtag[] }> {
  return http.get<{ hashtags: Hashtag[] }>('/api/hashtags', { query: { q } })
}
