import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { CACHE_KEYS, cacheRead, cacheRemove, cacheWrite } from '@/lib/cache'
import * as authService from '@/services/auth'
import type { ApiUser } from '@/types/api'

interface PersistedAuth {
  token: string
  user: ApiUser
}

export const useAuthStore = defineStore('auth', () => {
  const persisted = cacheRead<PersistedAuth>(CACHE_KEYS.auth)?.value ?? null
  const token = ref<string | null>(persisted?.token ?? null)
  const user = ref<ApiUser | null>(persisted?.user ?? null)
  /** Set when a 401 forces a logout, so the login page can explain why. */
  const sessionExpired = ref(false)

  const isAuthenticated = computed(() => token.value !== null)
  const isSuperadmin = computed(() => user.value?.role === 'SUPERADMIN')

  function setSession(newToken: string, newUser: ApiUser): void {
    token.value = newToken
    user.value = newUser
    sessionExpired.value = false
    cacheWrite<PersistedAuth>(CACHE_KEYS.auth, { token: newToken, user: newUser })
  }

  function clearSession(): void {
    token.value = null
    user.value = null
    cacheRemove(CACHE_KEYS.auth)
    cacheRemove(CACHE_KEYS.favorites)
  }

  async function login(email: string, password: string): Promise<void> {
    const response = await authService.login({ email, password })
    setSession(response.token, response.user)
  }

  function logout(): void {
    clearSession()
  }

  /** Called by the HTTP layer when an authenticated request gets a 401. */
  function handleUnauthorized(): void {
    if (token.value !== null) {
      clearSession()
      sessionExpired.value = true
    }
  }

  /** Refreshes profile data on app start; a failed refresh is non-fatal. */
  async function refreshProfile(): Promise<void> {
    if (token.value === null) return
    try {
      const { user: fresh } = await authService.me()
      user.value = fresh
      cacheWrite<PersistedAuth>(CACHE_KEYS.auth, { token: token.value, user: fresh })
    } catch {
      // 401 is already handled by the http layer; network errors keep the
      // cached session so the app still works offline in read-only mode.
    }
  }

  return {
    token,
    user,
    sessionExpired,
    isAuthenticated,
    isSuperadmin,
    login,
    logout,
    setSession,
    handleUnauthorized,
    refreshProfile,
  }
})
