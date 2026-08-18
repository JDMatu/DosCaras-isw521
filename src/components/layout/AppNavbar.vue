<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useCatalogStore } from '@/stores/catalog'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import * as searchService from '@/services/search'
import type { SearchViewResult } from '@/types/api'

const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()
const catalog = useCatalogStore()

const searchTerm = ref('')

// Spec: the global search fires the API call after a 300ms debounce. The
// navbar shows quick results in a dropdown; Enter opens the full results page.
const debouncedTerm = useDebouncedRef('', 300)
const quickResults = ref<SearchViewResult[]>([])
const quickOpen = ref(false)
const quickLoading = ref(false)
const searchBoxRef = ref<HTMLElement | null>(null)
let searchRequestId = 0

watch(searchTerm, (value) => {
  debouncedTerm.value = value
  if (value.trim() === '') {
    quickOpen.value = false
    quickResults.value = []
  }
})

watch(debouncedTerm, async (value) => {
  const q = value.trim()
  if (q === '') return
  const requestId = ++searchRequestId
  quickLoading.value = true
  try {
    const response = await searchService.search(q)
    if (requestId !== searchRequestId) return
    quickResults.value = response.views.slice(0, 5)
    quickOpen.value = true
  } catch {
    // Quick suggestions are best-effort; the full search page reports errors.
    if (requestId === searchRequestId) quickOpen.value = false
  } finally {
    if (requestId === searchRequestId) quickLoading.value = false
  }
})

function sideTitle(result: SearchViewResult): string {
  return result.sides.find((s) => s.type === 'SIDE')?.title ?? 'Publicación'
}

function openQuickResult(id: string): void {
  quickOpen.value = false
  searchTerm.value = ''
  void router.push({ name: 'view-detail', params: { id } })
}
const mobileMenuOpen = ref(false)
const categoriesOpen = ref(false)
const userMenuOpen = ref(false)
const categoriesMenuRef = ref<HTMLElement | null>(null)
const userMenuRef = ref<HTMLElement | null>(null)

const isDark = computed(() => theme.preference === 'dark' ||
  (theme.preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))

function submitSearch(): void {
  const q = searchTerm.value.trim()
  if (q === '') return
  mobileMenuOpen.value = false
  quickOpen.value = false
  void router.push({ name: 'search', query: { q } })
}

function closeMenus(event: MouseEvent): void {
  const target = event.target as Node
  if (categoriesMenuRef.value && !categoriesMenuRef.value.contains(target)) {
    categoriesOpen.value = false
  }
  if (userMenuRef.value && !userMenuRef.value.contains(target)) {
    userMenuOpen.value = false
  }
  if (searchBoxRef.value && !searchBoxRef.value.contains(target)) {
    quickOpen.value = false
  }
}

function onMenuKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    categoriesOpen.value = false
    userMenuOpen.value = false
  }
}

function logout(): void {
  userMenuOpen.value = false
  mobileMenuOpen.value = false
  auth.logout()
  void router.push({ name: 'board' })
}

onMounted(() => document.addEventListener('click', closeMenus))
onBeforeUnmount(() => document.removeEventListener('click', closeMenus))
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
    <nav class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3" aria-label="Navegación principal">
      <RouterLink :to="{ name: 'board' }" class="flex shrink-0 items-center gap-2 rounded-md font-bold text-stone-900 dark:text-stone-50">
        <img src="/favicon.svg" alt="" class="size-7" />
        <span class="hidden sm:inline">Las Dos Caras</span>
      </RouterLink>

      <!-- Categories dropdown (desktop) -->
      <div ref="categoriesMenuRef" class="relative hidden md:block" @keydown="onMenuKeydown">
        <button
          type="button"
          class="rounded-md px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
          :aria-expanded="categoriesOpen"
          aria-haspopup="true"
          @click="categoriesOpen = !categoriesOpen"
        >
          Categorías
          <span aria-hidden="true" class="ml-1 text-xs">▾</span>
        </button>
        <ul
          v-if="categoriesOpen"
          class="absolute left-0 mt-1 max-h-80 w-56 overflow-y-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900"
        >
          <li v-if="catalog.categories.length === 0" class="px-4 py-2 text-sm text-stone-500 dark:text-stone-400">
            No hay categorías disponibles
          </li>
          <li v-for="category in catalog.categories" :key="category.id">
            <RouterLink
              :to="{ name: 'category', params: { id: category.id } }"
              class="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
              @click="categoriesOpen = false"
            >
              {{ category.name }}
            </RouterLink>
          </li>
        </ul>
      </div>

      <!-- Global search -->
      <form ref="searchBoxRef" role="search" class="relative min-w-0 flex-1" @submit.prevent="submitSearch" @keydown.esc="quickOpen = false">
        <label for="global-search" class="sr-only">Buscar publicaciones</label>
        <div class="relative">
          <svg viewBox="0 0 20 20" fill="currentColor" class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" aria-hidden="true">
            <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd" />
          </svg>
          <input
            id="global-search"
            v-model="searchTerm"
            type="search"
            placeholder="Buscar publicaciones…"
            autocomplete="off"
            :aria-expanded="quickOpen"
            aria-haspopup="listbox"
            class="w-full rounded-full border border-stone-300 bg-stone-50 py-2 pl-9 pr-3 text-sm text-stone-900 placeholder-stone-400 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500"
            @focus="quickResults.length > 0 && searchTerm.trim() !== '' ? (quickOpen = true) : undefined"
          />
        </div>
        <div
          v-if="quickOpen"
          class="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900"
        >
          <p v-if="quickLoading" class="px-4 py-3 text-sm text-stone-500 dark:text-stone-400" role="status">
            Buscando…
          </p>
          <template v-else>
            <p v-if="quickResults.length === 0" class="px-4 py-3 text-sm text-stone-500 dark:text-stone-400">
              Sin resultados rápidos para «{{ searchTerm.trim() }}»
            </p>
            <ul v-else>
              <li v-for="result in quickResults" :key="result.id">
                <button
                  type="button"
                  class="block w-full px-4 py-2 text-left text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
                  @click="openQuickResult(result.id)"
                >
                  <span class="block truncate font-medium">{{ sideTitle(result) }}</span>
                  <span class="block truncate text-xs text-stone-500 dark:text-stone-400">
                    {{ result.category.name }} · {{ result.author.name }}
                  </span>
                </button>
              </li>
            </ul>
            <button
              type="submit"
              class="block w-full border-t border-stone-200 px-4 py-2 text-left text-sm font-medium text-amber-800 hover:bg-stone-100 dark:border-stone-700 dark:text-amber-400 dark:hover:bg-stone-800"
            >
              Ver todos los resultados →
            </button>
          </template>
        </div>
      </form>

      <!-- Theme toggle -->
      <button
        type="button"
        class="rounded-md p-2 text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
        :aria-label="isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
        @click="theme.toggle()"
      >
        <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-5" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
      </button>

      <!-- Desktop session controls -->
      <div class="hidden items-center gap-2 md:flex">
        <template v-if="!auth.isAuthenticated">
          <RouterLink
            :to="{ name: 'login' }"
            class="rounded-md px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Iniciar sesión
          </RouterLink>
          <RouterLink
            :to="{ name: 'register' }"
            class="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            Registrarse
          </RouterLink>
        </template>
        <template v-else>
          <RouterLink
            :to="{ name: 'view-create' }"
            class="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            + Publicar
          </RouterLink>
          <div ref="userMenuRef" class="relative" @keydown="onMenuKeydown">
            <button
              type="button"
              class="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
              :aria-expanded="userMenuOpen"
              aria-haspopup="true"
              @click="userMenuOpen = !userMenuOpen"
            >
              <span class="flex size-6 items-center justify-center rounded-full bg-amber-700 text-xs font-bold text-white dark:bg-amber-600" aria-hidden="true">
                {{ auth.user?.name.charAt(0).toUpperCase() }}
              </span>
              {{ auth.user?.name }}
              <span aria-hidden="true" class="text-xs">▾</span>
            </button>
            <ul v-if="userMenuOpen" class="absolute right-0 mt-1 w-52 rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
              <li>
                <RouterLink :to="{ name: 'profile' }" class="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800" @click="userMenuOpen = false">
                  Mi perfil
                </RouterLink>
              </li>
              <template v-if="auth.isSuperadmin">
                <li role="separator" class="my-1 border-t border-stone-200 dark:border-stone-700"></li>
                <li>
                  <RouterLink :to="{ name: 'admin-users' }" class="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800" @click="userMenuOpen = false">
                    Gestión de usuarios
                  </RouterLink>
                </li>
                <li>
                  <RouterLink :to="{ name: 'admin-categories' }" class="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800" @click="userMenuOpen = false">
                    Gestión de categorías
                  </RouterLink>
                </li>
                <li>
                  <RouterLink :to="{ name: 'admin-moderation' }" class="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800" @click="userMenuOpen = false">
                    Moderación
                  </RouterLink>
                </li>
              </template>
              <li role="separator" class="my-1 border-t border-stone-200 dark:border-stone-700"></li>
              <li>
                <button type="button" class="block w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-stone-100 dark:text-red-400 dark:hover:bg-stone-800" @click="logout">
                  Cerrar sesión
                </button>
              </li>
            </ul>
          </div>
        </template>
      </div>

      <!-- Mobile menu toggle -->
      <button
        type="button"
        class="rounded-md p-2 text-stone-600 hover:bg-stone-100 md:hidden dark:text-stone-300 dark:hover:bg-stone-800"
        :aria-expanded="mobileMenuOpen"
        aria-label="Abrir menú de navegación"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-6" aria-hidden="true">
          <path v-if="!mobileMenuOpen" stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </nav>

    <!-- Mobile menu -->
    <div v-if="mobileMenuOpen" class="border-t border-stone-200 px-4 py-3 md:hidden dark:border-stone-800">
      <p class="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Categorías</p>
      <ul class="mb-3 max-h-48 overflow-y-auto">
        <li v-if="catalog.categories.length === 0" class="px-1 py-1 text-sm text-stone-500 dark:text-stone-400">
          No hay categorías disponibles
        </li>
        <li v-for="category in catalog.categories" :key="category.id">
          <RouterLink
            :to="{ name: 'category', params: { id: category.id } }"
            class="block rounded px-1 py-1.5 text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
            @click="mobileMenuOpen = false"
          >
            {{ category.name }}
          </RouterLink>
        </li>
      </ul>
      <div class="flex flex-col gap-1 border-t border-stone-200 pt-3 dark:border-stone-800">
        <template v-if="!auth.isAuthenticated">
          <RouterLink :to="{ name: 'login' }" class="rounded px-1 py-1.5 text-sm font-medium text-stone-700 dark:text-stone-200" @click="mobileMenuOpen = false">
            Iniciar sesión
          </RouterLink>
          <RouterLink :to="{ name: 'register' }" class="rounded px-1 py-1.5 text-sm font-medium text-stone-700 dark:text-stone-200" @click="mobileMenuOpen = false">
            Registrarse
          </RouterLink>
        </template>
        <template v-else>
          <RouterLink :to="{ name: 'view-create' }" class="rounded px-1 py-1.5 text-sm font-medium text-stone-700 dark:text-stone-200" @click="mobileMenuOpen = false">
            + Publicar
          </RouterLink>
          <RouterLink :to="{ name: 'profile' }" class="rounded px-1 py-1.5 text-sm font-medium text-stone-700 dark:text-stone-200" @click="mobileMenuOpen = false">
            Mi perfil
          </RouterLink>
          <template v-if="auth.isSuperadmin">
            <RouterLink :to="{ name: 'admin-users' }" class="rounded px-1 py-1.5 text-sm font-medium text-stone-700 dark:text-stone-200" @click="mobileMenuOpen = false">
              Gestión de usuarios
            </RouterLink>
            <RouterLink :to="{ name: 'admin-categories' }" class="rounded px-1 py-1.5 text-sm font-medium text-stone-700 dark:text-stone-200" @click="mobileMenuOpen = false">
              Gestión de categorías
            </RouterLink>
            <RouterLink :to="{ name: 'admin-moderation' }" class="rounded px-1 py-1.5 text-sm font-medium text-stone-700 dark:text-stone-200" @click="mobileMenuOpen = false">
              Moderación
            </RouterLink>
          </template>
          <button type="button" class="rounded px-1 py-1.5 text-left text-sm font-medium text-red-700 dark:text-red-400" @click="logout">
            Cerrar sesión
          </button>
        </template>
      </div>
    </div>
  </header>
</template>
