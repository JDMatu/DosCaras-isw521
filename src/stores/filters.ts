import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { CACHE_KEYS, cacheRead, cacheWrite } from '@/lib/cache'

export type BoardSort = 'likes' | 'dislikes' | 'recent'

export interface BoardFilters {
  category: string
  hashtag: string
  sort: BoardSort
}

const DEFAULTS: BoardFilters = { category: '', hashtag: '', sort: 'recent' }

export const useFiltersStore = defineStore('filters', () => {
  const saved = cacheRead<BoardFilters>(CACHE_KEYS.filters)?.value
  const filters = ref<BoardFilters>({ ...DEFAULTS, ...saved })

  watch(
    filters,
    (value) => {
      cacheWrite(CACHE_KEYS.filters, value)
    },
    { deep: true },
  )

  function reset(): void {
    filters.value = { ...DEFAULTS }
  }

  return { filters, reset }
})
