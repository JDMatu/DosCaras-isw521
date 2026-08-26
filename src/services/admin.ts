import { http } from '@/lib/http'
import type { ApiUser, Category, PaginatedUsers, PaginatedViews, ViewStatus } from '@/types/api'

export function listUsers(query: {
  search?: string
  page?: number
  limit?: number
}): Promise<PaginatedUsers> {
  return http.get<PaginatedUsers>('/api/admin/users', { query: { ...query } })
}

export function banUser(id: string): Promise<{ user: ApiUser }> {
  return http.patch<{ user: ApiUser }>(`/api/admin/users/${encodeURIComponent(id)}/ban`)
}

export function unbanUser(id: string): Promise<{ user: ApiUser }> {
  return http.patch<{ user: ApiUser }>(`/api/admin/users/${encodeURIComponent(id)}/unban`)
}

/** Includes soft-deleted categories (deletedAt set). */
export function listAllCategories(): Promise<{ categories: Category[] }> {
  return http.get<{ categories: Category[] }>('/api/admin/categories')
}

export function createCategory(name: string): Promise<{ category: Category }> {
  return http.post<{ category: Category }>('/api/admin/categories', { body: { name } })
}

export function updateCategory(id: string, name: string): Promise<{ category: Category }> {
  return http.put<{ category: Category }>(`/api/admin/categories/${encodeURIComponent(id)}`, {
    body: { name },
  })
}

/** Soft delete; responds 204 with no body. */
export function deleteCategory(id: string): Promise<void> {
  return http.delete<void>(`/api/admin/categories/${encodeURIComponent(id)}`)
}

export function listAllViews(query: {
  status?: ViewStatus
  page?: number
  limit?: number
}): Promise<PaginatedViews> {
  return http.get<PaginatedViews>('/api/admin/views', { query: { ...query } })
}
