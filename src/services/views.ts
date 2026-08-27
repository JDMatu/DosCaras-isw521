import { http } from '@/lib/http'
import type {
  BareView,
  CreateViewInput,
  PaginatedViews,
  PoliticalView,
  ReactionResponse,
  ViewsQuery,
} from '@/types/api'

export function listViews(query: ViewsQuery = {}): Promise<PaginatedViews> {
  return http.get<PaginatedViews>('/api/views', { query: { ...query } })
}

export function getView(id: string): Promise<{ view: PoliticalView }> {
  return http.get<{ view: PoliticalView }>(`/api/views/${encodeURIComponent(id)}`)
}

export function createView(input: CreateViewInput): Promise<{ view: PoliticalView }> {
  return http.post<{ view: PoliticalView }>('/api/views', { body: input })
}

export function updateView(id: string, input: CreateViewInput): Promise<{ view: PoliticalView }> {
  return http.put<{ view: PoliticalView }>(`/api/views/${encodeURIComponent(id)}`, { body: input })
}

export function unpublishView(id: string): Promise<{ view: BareView }> {
  return http.patch<{ view: BareView }>(`/api/views/${encodeURIComponent(id)}/unpublish`)
}

export function publishView(id: string): Promise<{ view: BareView }> {
  return http.patch<{ view: BareView }>(`/api/views/${encodeURIComponent(id)}/publish`)
}

/** `side` is `a` (SIDE) or `b` (COUNTERPART). Upsert: repeating changes type. */
export function react(
  viewId: string,
  side: 'a' | 'b',
  reaction: 'like' | 'dislike',
): Promise<ReactionResponse> {
  return http.post<ReactionResponse>(
    `/api/views/${encodeURIComponent(viewId)}/sides/${side}/${reaction}`,
  )
}

export function addFavorite(viewId: string): Promise<{ isFavorite: boolean }> {
  return http.post<{ isFavorite: boolean }>(`/api/views/${encodeURIComponent(viewId)}/favorite`)
}

export function removeFavorite(viewId: string): Promise<{ isFavorite: boolean }> {
  return http.delete<{ isFavorite: boolean }>(`/api/views/${encodeURIComponent(viewId)}/favorite`)
}

export function myFavoriteIds(): Promise<{ favorites: string[] }> {
  return http.get<{ favorites: string[] }>('/api/users/me/favorites')
}
