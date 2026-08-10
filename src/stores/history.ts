import { defineStore } from 'pinia'
import { ref } from 'vue'
import { CACHE_KEYS, cacheRead, cacheRemove, cacheWrite } from '@/lib/cache'

export interface HistoryEntry {
  id: string
  titulo: string
  categoria: string
  fechaVista: string
}

const MAX_ENTRIES = 20

export const useHistoryStore = defineStore('history', () => {
  const entries = ref<HistoryEntry[]>(cacheRead<HistoryEntry[]>(CACHE_KEYS.history)?.value ?? [])

  function record(entry: Omit<HistoryEntry, 'fechaVista'>): void {
    const next = entries.value.filter((e) => e.id !== entry.id)
    next.unshift({ ...entry, fechaVista: new Date().toISOString() })
    entries.value = next.slice(0, MAX_ENTRIES)
    cacheWrite(CACHE_KEYS.history, entries.value)
  }

  function clear(): void {
    entries.value = []
    cacheRemove(CACHE_KEYS.history)
  }

  return { entries, record, clear }
})
