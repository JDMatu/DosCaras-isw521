export const CACHE_KEYS = {
  auth: 'lasdoscaras_auth',
  categories: 'lasdoscaras_categories',
  hashtags: 'lasdoscaras_hashtags',
  filters: 'lasdoscaras_filters',
  favorites: 'lasdoscaras_favorites',
  draft: 'lasdoscaras_draft',
  theme: 'lasdoscaras_theme',
  history: 'lasdoscaras_history',
  board: 'lasdoscaras_board',
} as const

export type CacheKey = (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS]

export const TTL = {
  oneHour: 60 * 60 * 1000,
  thirtyMinutes: 30 * 60 * 1000,
} as const

interface CacheEntry<T> {
  value: T
  writtenAt: number
}

export interface CacheReadResult<T> {
  value: T
  stale: boolean
}

export function cacheWrite<T>(key: CacheKey, value: T): void {
  const entry: CacheEntry<T> = { value, writtenAt: Date.now() }
  try {
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // Storage full or unavailable: caching is best-effort, never fatal.
  }
}

export function cacheRead<T>(key: CacheKey, ttlMs?: number): CacheReadResult<T> | null {
  const raw = localStorage.getItem(key)
  if (raw === null) return null
  try {
    const entry = JSON.parse(raw) as CacheEntry<T>
    if (typeof entry !== 'object' || entry === null || !('value' in entry)) return null
    const stale = ttlMs !== undefined && Date.now() - entry.writtenAt > ttlMs
    return { value: entry.value, stale }
  } catch {
    localStorage.removeItem(key)
    return null
  }
}

export function cacheRemove(key: CacheKey): void {
  localStorage.removeItem(key)
}
