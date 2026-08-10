import { defineStore } from 'pinia'
import { ref } from 'vue'
import { CACHE_KEYS, TTL, cacheRead, cacheWrite } from '@/lib/cache'
import * as categoriesService from '@/services/categories'
import * as hashtagsService from '@/services/hashtags'
import type { Category, Hashtag } from '@/types/api'

export const useCatalogStore = defineStore('catalog', () => {
  const categories = ref<Category[]>([])
  const hashtags = ref<Hashtag[]>([])
  /** True while showing cached data that could not be revalidated. */
  const categoriesFromCache = ref(false)
  const hashtagsFromCache = ref(false)

  async function loadCategories(): Promise<void> {
    const cached = cacheRead<Category[]>(CACHE_KEYS.categories, TTL.oneHour)
    if (cached) {
      categories.value = cached.value
      categoriesFromCache.value = true
      if (!cached.stale) {
        // Fresh enough: still revalidate in the background, but don't block.
        void revalidateCategories()
        return
      }
    }
    await revalidateCategories()
  }

  async function revalidateCategories(): Promise<void> {
    try {
      const { categories: fresh } = await categoriesService.listCategories()
      categories.value = fresh
      categoriesFromCache.value = false
      cacheWrite(CACHE_KEYS.categories, fresh)
    } catch {
      // Keep whatever the cache had; callers surface offline state globally.
    }
  }

  async function loadHashtags(): Promise<void> {
    const cached = cacheRead<Hashtag[]>(CACHE_KEYS.hashtags, TTL.thirtyMinutes)
    if (cached) {
      hashtags.value = cached.value
      hashtagsFromCache.value = true
      if (!cached.stale) {
        void revalidateHashtags()
        return
      }
    }
    await revalidateHashtags()
  }

  async function revalidateHashtags(): Promise<void> {
    try {
      const { hashtags: fresh } = await hashtagsService.listHashtags()
      hashtags.value = fresh
      hashtagsFromCache.value = false
      cacheWrite(CACHE_KEYS.hashtags, fresh)
    } catch {
      // Same fallback rationale as categories.
    }
  }

  return {
    categories,
    hashtags,
    categoriesFromCache,
    hashtagsFromCache,
    loadCategories,
    loadHashtags,
    revalidateCategories,
    revalidateHashtags,
  }
})
