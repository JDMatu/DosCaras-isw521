<script setup lang="ts">

import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BoardFiltersBar from '@/components/board/BoardFiltersBar.vue'
import ViewsGrid from '@/components/board/ViewsGrid.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import PaginationControls from '@/components/ui/PaginationControls.vue'
import { ApiError, NetworkError, errorMessage } from '@/lib/http'
import * as categoriesService from '@/services/categories'
import * as viewsService from '@/services/views'
import { useCatalogStore } from '@/stores/catalog'
import { useConnectionStore } from '@/stores/connection'
import type { BoardSort } from '@/stores/filters'
import type { Category, PoliticalView } from '@/types/api'

const PAGE_LIMIT = 12

interface CategoryListState {
  hashtag: string
  sort: BoardSort
  page: number
}

const route = useRoute()
const router = useRouter()
const catalog = useCatalogStore()
const connection = useConnectionStore()

const category = ref<Category | null>(null)
const categoryError = ref('')
const notFound = ref(false)
const loadingCategory = ref(false)

const views = ref<PoliticalView[]>([])
const total = ref(0)
const loadingViews = ref(false)
const viewsError = ref('')

const categoryId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))

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

const state = computed<CategoryListState>(() => ({
  hashtag: readString(route.query.hashtag),
  sort: readSort(route.query.sort),
  page: readPage(route.query.page),
}))

const hasFilters = computed(() => state.value.hashtag !== '' || state.value.sort !== 'recent')

function buildQuery(next: CategoryListState): Record<string, string> {
  const query: Record<string, string> = {}
  if (next.hashtag !== '') query.hashtag = next.hashtag
  if (next.sort !== 'recent') query.sort = next.sort
  if (next.page > 1) query.page = String(next.page)
  return query
}

function applyFilters(patch: Partial<CategoryListState>): void {
  void router.replace({
    name: 'category',
    params: { id: categoryId.value },
    query: buildQuery({ ...state.value, ...patch, page: 1 }),
  })
}

function changePage(page: number): void {
  void router.push({
    name: 'category',
    params: { id: categoryId.value },
    query: buildQuery({ ...state.value, page }),
  })
}

const hashtagModel = computed<string>({
  get: () => state.value.hashtag,
  set: (value) => applyFilters({ hashtag: value }),
})

const sortModel = computed<BoardSort>({
  get: () => state.value.sort,
  set: (value) => applyFilters({ sort: value }),
})

function clearFilters(): void {
  void router.replace({ name: 'category', params: { id: categoryId.value }, query: {} })
}

async function loadCategory(): Promise<void> {
  if (categoryId.value === '') return
  loadingCategory.value = true
  categoryError.value = ''
  notFound.value = false
  try {
    const { category: fetched } = await categoriesService.getCategory(categoryId.value)
    category.value = fetched
  } catch (err) {
    category.value = null
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
      notFound.value = true
    } else if (err instanceof NetworkError) {
      const cached = catalog.categories.find((item) => item.id === categoryId.value)
      if (cached) category.value = cached
      else categoryError.value = errorMessage(err)
    } else {
      categoryError.value = errorMessage(err)
    }
  } finally {
    loadingCategory.value = false
  }
}

let requestId = 0

async function loadViews(): Promise<void> {
  if (categoryId.value === '') return
  const current = ++requestId
  const snapshot = state.value
  loadingViews.value = true
  viewsError.value = ''
  try {
    const result = await viewsService.listViews({
      category: categoryId.value,
      hashtag: snapshot.hashtag || undefined,
      sort: snapshot.sort,
      page: snapshot.page,
      limit: PAGE_LIMIT,
    })
    if (current !== requestId) return
    views.value = result.views
    total.value = result.total
  } catch (err) {
    if (current !== requestId) return
    views.value = []
    total.value = 0
    viewsError.value = errorMessage(err)
  } finally {
    if (current === requestId) loadingViews.value = false
  }
}

function reload(): void {
  void loadCategory()
  void loadViews()
}

watch(categoryId, (value) => {
  if (value === '') return
  reload()
})

watch(state, () => {
  if (route.name !== 'category') return
  void loadViews()
})

watch(
  () => connection.becameOnline,
  () => {
    reload()
  },
)

onMounted(() => {
  reload()
})
</script>

<template>
  <section>
    <nav aria-label="Migas de pan" class="mb-4">
      <ol class="flex flex-wrap items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
        <li>
          <RouterLink
            :to="{ name: 'board' }"
            class="font-medium text-amber-800 hover:underline dark:text-amber-400"
          >
            Inicio
          </RouterLink>
        </li>
        <li aria-hidden="true">›</li>
        <li>Categorías</li>
        <li aria-hidden="true">›</li>
        <li aria-current="page" class="font-medium text-stone-900 dark:text-stone-100">
          {{ category?.name ?? (notFound ? 'No encontrada' : '…') }}
        </li>
      </ol>
    </nav>

    <template v-if="notFound">
      <ErrorState message="Esta categoría no existe o fue eliminada." />
      <p class="mt-4 text-center">
        <RouterLink
          :to="{ name: 'board' }"
          class="text-sm font-medium text-amber-800 hover:underline dark:text-amber-400"
        >
          Volver al tablero
        </RouterLink>
      </p>
    </template>

    <template v-else>
      <header class="mb-6">
        <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-50">
          {{ category?.name ?? (loadingCategory ? 'Cargando categoría…' : 'Categoría') }}
        </h1>
        <p v-if="categoryError" role="alert" class="mt-1 text-sm text-red-700 dark:text-red-400">
          {{ categoryError }}
        </p>
        <p v-else-if="!loadingViews" class="mt-1 text-sm text-stone-600 dark:text-stone-300">
          {{ total }} {{ total === 1 ? 'publicación' : 'publicaciones' }}
          {{ hasFilters ? 'con los filtros aplicados' : 'en esta categoría' }}
        </p>
      </header>

      <BoardFiltersBar
        v-model:hashtag="hashtagModel"
        v-model:sort="sortModel"
        :show-category="false"
        :hashtag-suggestions="catalog.hashtags"
        :disabled="loadingViews"
        :can-clear="hasFilters"
        @clear="clearFilters"
      />

      <p class="sr-only" role="status" aria-live="polite">
        {{ loadingViews ? 'Cargando publicaciones…' : `${total} publicaciones encontradas.` }}
      </p>

      <ErrorState
        v-if="viewsError && !loadingViews"
        :message="viewsError"
        retryable
        @retry="loadViews"
      />

      <EmptyState
        v-else-if="!loadingViews && views.length === 0"
        title="No hay publicaciones en esta categoría"
        :description="
          hasFilters
            ? 'Ninguna publicación de esta categoría coincide con los filtros aplicados.'
            : 'Todavía nadie publicó en esta categoría.'
        "
      >
        <BaseButton v-if="hasFilters" variant="secondary" @click="clearFilters">
          Limpiar filtros
        </BaseButton>
      </EmptyState>

      <template v-else>
        <ViewsGrid :views="views" :loading="loadingViews" :skeleton-count="6" />
        <PaginationControls
          class="mt-8"
          :page="state.page"
          :limit="PAGE_LIMIT"
          :total="total"
          :disabled="loadingViews"
          @change="changePage"
        />
      </template>
    </template>
  </section>
</template>
