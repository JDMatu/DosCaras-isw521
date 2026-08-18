import { defineStore } from 'pinia'
import { ref } from 'vue'
import { CACHE_KEYS, cacheRead, cacheRemove, cacheWrite } from '@/lib/cache'
import * as viewsService from '@/services/views'

/**
 * Favorite view ids, synced with the API on login and cached under
 * `lasdoscaras_favorites` so cards can paint the heart state instantly.
 */
export const useFavoritesStore = defineStore('favorites', () => {
  const ids = ref<Set<string>>(new Set(cacheRead<string[]>(CACHE_KEYS.favorites)?.value ?? []))

  function isFavorite(viewId: string): boolean {
    return ids.value.has(viewId)
  }

  function persist(): void {
    cacheWrite(CACHE_KEYS.favorites, [...ids.value])
  }

  /** Loads the full id list from the API (called right after login). */
  async function sync(): Promise<void> {
    const { favorites } = await viewsService.myFavoriteIds()
    ids.value = new Set(favorites)
    persist()
  }

  async function add(viewId: string): Promise<void> {
    await viewsService.addFavorite(viewId)
    ids.value = new Set(ids.value).add(viewId)
    persist()
  }

  async function remove(viewId: string): Promise<void> {
    await viewsService.removeFavorite(viewId)
    const next = new Set(ids.value)
    next.delete(viewId)
    ids.value = next
    persist()
  }

  async function toggle(viewId: string): Promise<boolean> {
    if (isFavorite(viewId)) {
      await remove(viewId)
      return false
    }
    await add(viewId)
    return true
  }

  function clear(): void {
    ids.value = new Set()
    cacheRemove(CACHE_KEYS.favorites)
  }

  return { ids, isFavorite, sync, add, remove, toggle, clear }
})
