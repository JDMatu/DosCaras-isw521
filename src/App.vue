<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import AppNavbar from '@/components/layout/AppNavbar.vue'
import ToastList from '@/components/ui/ToastList.vue'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useConnectionStore } from '@/stores/connection'
import { useToastsStore } from '@/stores/toasts'
import { useFavoritesStore } from '@/stores/favorites'

const router = useRouter()
const auth = useAuthStore()
const catalog = useCatalogStore()
const connection = useConnectionStore()
const toasts = useToastsStore()
const favorites = useFavoritesStore()

watch(
  () => auth.sessionExpired,
  (expired) => {
    if (expired) {
      toasts.warning('Su sesión ha expirado. Iniciá sesión nuevamente.')
      void router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    }
  },
)

watch(
  () => connection.becameOnline,
  () => {
    void catalog.revalidateCategories()
    void catalog.revalidateHashtags()
  },
)

onMounted(() => {
  void catalog.loadCategories()
  void catalog.loadHashtags()
  void auth.refreshProfile()
  if (auth.isAuthenticated) {
    favorites.sync().catch(() => {
      // Offline or expired session: the cached ids remain usable.
    })
  }
})
</script>

<template>
  <a
    href="#main-content"
    class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-amber-700 focus:px-4 focus:py-2 focus:text-white"
  >
    Saltar al contenido principal
  </a>
  <div class="flex min-h-screen flex-col">
    <AppNavbar />
    <div
      v-if="!connection.browserOnline || !connection.apiReachable"
      role="status"
      class="border-b border-amber-300 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
    >
      {{
        connection.browserOnline
          ? 'Sin conexión con el servidor. Mostrando información guardada.'
          : 'Sin conexión a Internet. Mostrando información guardada.'
      }}
    </div>
    <main id="main-content" class="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <RouterView />
    </main>
    <footer class="border-t border-stone-200 py-4 text-center text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
      Las Dos Caras — Proyecto Final ISW-521 · Cada tema tiene dos perspectivas
    </footer>
  </div>
  <ToastList />
</template>
