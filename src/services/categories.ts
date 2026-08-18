import { http } from '@/lib/http'
import type { Category } from '@/types/api'

export function listCategories(): Promise<{ categories: Category[] }> {
  return http.get<{ categories: Category[] }>('/api/categories')
}

export function getCategory(id: string): Promise<{ category: Category }> {
  return http.get<{ category: Category }>(`/api/categories/${encodeURIComponent(id)}`)
}
