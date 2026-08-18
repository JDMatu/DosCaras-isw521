<script setup lang="ts">

import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BoardFiltersBar from '@/components/board/BoardFiltersBar.vue'
import ViewsGrid from '@/components/board/ViewsGrid.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import PaginationControls from '@/components/ui/PaginationControls.vue'
import { CACHE_KEYS, cacheRead, cacheWrite } from '@/lib/cache'
import { NetworkError, errorMessage } from '@/lib/http'
import * as viewsService from '@/services/views'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useConnectionStore } from '@/stores/connection'
import { useFiltersStore, type BoardSort } from '@/stores/filters'
import type { PoliticalView } from '@/types/api'

const PAGE_LIMIT = 12
const FILTER_KEYS = ['category', 'hashtag', 'sort', 'page'] as const

interface BoardState {
  category: string
  hashtag: string
  sort: BoardSort
  page: number
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const catalog = useCatalogStore()
const connection = useConnectionStore()
const filtersStore = useFiltersStore()

const views = ref<PoliticalView[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
/** True while the grid shows the offline snapshot instead of fresh data. */
const fromCache = ref(false)

function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function readSort(value: unknown): BoardSort {
  return value === 'likes' || value === 'dislikes' ? value : 'recent'
}

function readPage(value: unknown): number {
  const parsed = Number.parseInt(readString(value), 10)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
}

const state = computed<BoardState>(() => ({
  category: readString(route.query.category),
  hashtag: readString(route.query.hashtag),
  sort: readSort(route.query.sort),
  page: readPage(route.query.page),
}))

const hasFilters = computed(
  () => state.value.category !== '' || state.value.hashtag !== '' || state.value.sort !== 'recent',
)

function buildQuery(next: BoardState): Record<string, string> {
  const query: Record<string, string> = {}
  if (next.category !== '') query.category = next.category
  if (next.hashtag !== '') query.hashtag = next.hashtag
  if (next.sort !== 'recent') query.sort = next.sort
  if (next.page > 1) query.page = String(next.page)
  return query
}

function applyFilters(patch: Partial<BoardState>): void {
  void router.replace({ name: 'board', query: buildQuery({ ...state.value, ...patch, page: 1 }) })
}

function changePage(page: number): void {
  void router.push({ name: 'board', query: buildQuery({ ...state.value, page }) })
}

const categoryModel = computed<string>({
  get: () => state.value.category,
  set: (value) => applyFilters({ category: value }),
})

const hashtagModel = computed<string>({
  get: () => state.value.hashtag,
  set: (value) => applyFilters({ hashtag: value }),
})

const sortModel = computed<BoardSort>({
  get: () => state.value.sort,
  set: (value) => applyFilters({ sort: value }),
})

function clearFilters(): void {
  filtersStore.reset()
  void router.replace({ name: 'board', query: {} })
}

/**
 * Offline read-only mode: the cached snapshot is the unfiltered first page, so
 * category/hashtag/sort are applied locally over it.
 */
function filterCached(cached: PoliticalView[], current: BoardState): PoliticalView[] {
  let result = cached
  if (current.category !== '') {
    result = result.filter((view) => view.categoryId === current.category)
  }
  if (current.hashtag !== '') {
    const tag = current.hashtag.toLowerCase()
    result = result.filter((view) => view.hashtags.some((item) => item.name.toLowerCase() === tag))
  }
  const sorted = [...result]
  if (current.sort === 'likes') {
    sorted.sort((a, b) => b.totalLikes - a.totalLikes)
  } else if (current.sort === 'dislikes') {
    sorted.sort((a, b) => b.totalDislikes - a.totalDislikes)
  } else {
    sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  return sorted
}

// Guards against out-of-order responses when filters change quickly.
let requestId = 0

async function load(): Promise<void> {
  const current = ++requestId
  const snapshot = state.value
  loading.value = true
  error.value = ''
  fromCache.value = false
  try {
    const result = await viewsService.listViews({
      category: snapshot.category || undefined,
      hashtag: snapshot.hashtag || undefined,
      sort: snapshot.sort,
      page: snapshot.page,
      limit: PAGE_LIMIT,
    })
    if (current !== requestId) return
    views.value = result.views
    total.value = result.total
    // Only the unfiltered first page is worth keeping as the offline snapshot.
    if (snapshot.page === 1 && snapshot.category === '' && snapshot.hashtag === '') {
      cacheWrite(CACHE_KEYS.board, result.views)
    }
  } catch (err) {
    if (current !== requestId) return
    const cached =
      err instanceof NetworkError ? cacheRead<PoliticalView[]>(CACHE_KEYS.board)?.value : undefined
    if (cached !== undefined && cached.length > 0) {
      views.value = filterCached(cached, snapshot)
      total.value = views.value.length
      fromCache.value = true
    } else {
      views.value = []
      total.value = 0
      error.value = errorMessage(err)
    }
  } finally {
    if (current === requestId) loading.value = false
  }
}

watch(state, (value) => {
  if (route.name !== 'board') return
  filtersStore.filters = { category: value.category, hashtag: value.hashtag, sort: value.sort }
  void load()
})

// Reconnection (browser `online` or the first API success after a failure).
watch(
  () => connection.becameOnline,
  () => {
    void load()
  },
)

onMounted(async () => {
  const urlHasFilters = FILTER_KEYS.some((key) => key in route.query)
  if (!urlHasFilters) {
    const saved = filtersStore.filters
    if (saved.category !== '' || saved.hashtag !== '' || saved.sort !== 'recent') {
      // Seeding the URL triggers the `state` watcher, which loads the board.
      await router.replace({ name: 'board', query: buildQuery({ ...saved, page: 1 }) })
      return
    }
  }
  filtersStore.filters = {
    category: state.value.category,
    hashtag: state.value.hashtag,
    sort: state.value.sort,
  }
  await load()
})
</script>

<template>
  <section>
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-50">Tablero de publicaciones</h1>
        <p class="mt-1 text-sm text-stone-600 dark:text-stone-300">
          Ningún tema tiene una sola cara: explorá cada postura y su contrapostura.
        </p>
      </div>
      <RouterLink v-if="auth.isAuthenticated" :to="{ name: 'view-create' }">
        <BaseButton type="button">Nueva publicación</BaseButton>
      </RouterLink>
    </div>

    <BoardFiltersBar
      v-model:category="categoryModel"
      v-model:hashtag="hashtagModel"
      v-model:sort="sortModel"
      :categories="catalog.categories"
      :hashtag-suggestions="catalog.hashtags"
      :disabled="loading"
      :can-clear="hasFilters"
      @clear="clearFilters"
    />

    <p
      v-if="fromCache"
      role="status"
      class="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
    >
      Mostrando información guardada — sin conexión al servidor.
    </p>

    <p class="sr-only" role="status" aria-live="polite">
      {{ loading ? 'Cargando publicaciones…' : `${total} publicaciones encontradas.` }}
    </p>

    <ErrorState
      v-if="error && !loading"
      :message="error"
      retryable
      @retry="load"
    />

    <EmptyState
      v-else-if="!loading && views.length === 0"
      title="No hay publicaciones para mostrar"
      :description="
        hasFilters
          ? 'Ninguna publicación coincide con los filtros aplicados. Probá con otra categoría, otro hashtag u otro orden.'
          : 'Todavía no hay publicaciones en el tablero. Volvé pronto o creá la primera.'
      "
    >
      <BaseButton v-if="hasFilters" variant="secondary" @click="clearFilters">
        Limpiar filtros
      </BaseButton>
      <RouterLink v-else-if="auth.isAuthenticated" :to="{ name: 'view-create' }">
        <BaseButton>Crear la primera publicación</BaseButton>
      </RouterLink>
    </EmptyState>

    <template v-else>
      <ViewsGrid :views="views" :loading="loading" :skeleton-count="6" />
      <PaginationControls
        v-if="!fromCache"
        class="mt-8"
        :page="state.page"
        :limit="PAGE_LIMIT"
        :total="total"
        :disabled="loading"
        @change="changePage"
      />
    </template>
  </section>
</template>
