import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'
import { CACHE_KEYS, cacheRead, cacheRemove, cacheWrite } from '@/lib/cache'

export type ThemePreference = 'light' | 'dark' | 'system'

export const useThemeStore = defineStore('theme', () => {
  const stored = cacheRead<string>(CACHE_KEYS.theme)?.value
  const preference = ref<ThemePreference>(
    stored === 'light' || stored === 'dark' ? stored : 'system',
  )

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const systemDark = ref(media.matches)
  media.addEventListener('change', (e) => {
    systemDark.value = e.matches
  })

  watchEffect(() => {
    const dark = preference.value === 'dark' || (preference.value === 'system' && systemDark.value)
    document.documentElement.classList.toggle('dark', dark)
  })

  function setPreference(value: ThemePreference): void {
    preference.value = value
    if (value === 'system') cacheRemove(CACHE_KEYS.theme)
    else cacheWrite(CACHE_KEYS.theme, value)
  }

  function toggle(): void {
    const dark = document.documentElement.classList.contains('dark')
    setPreference(dark ? 'light' : 'dark')
  }

  return { preference, setPreference, toggle }
})
