<script setup lang="ts">

import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ViewsGrid from '@/components/board/ViewsGrid.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import PaginationControls from '@/components/ui/PaginationControls.vue'
import { formatDate } from '@/lib/format'
import { ApiError, errorMessage } from '@/lib/http'
import * as authorsService from '@/services/authors'
import * as viewsService from '@/services/views'
import { useConnectionStore } from '@/stores/connection'
import type { Author, PoliticalView } from '@/types/api'

const PAGE_LIMIT = 12

const route = useRoute()
const router = useRouter()
const connection = useConnectionStore()

const author = ref<Author | null>(null)
const authorError = ref('')
const notFound = ref(false)
const loadingAuthor = ref(false)

const views = ref<PoliticalView[]>([])
const total = ref(0)
const loadingViews = ref(false)
const viewsError = ref('')

const authorId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))

function readPage(value: unknown): number {
  const parsed = Number.parseInt(typeof value === 'string' ? value : '', 10)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
}

const page = computed(() => readPage(route.query.page))

function changePage(next: number): void {
  void router.push({
    name: 'author',
    params: { id: authorId.value },
    query: next > 1 ? { page: String(next) } : {},
  })
}

async function loadAuthor(): Promise<void> {
  if (authorId.value === '') return
  loadingAuthor.value = true
  authorError.value = ''
  notFound.value = false
  try {
    const { author: fetched } = await authorsService.getAuthor(authorId.value)
    author.value = fetched
  } catch (err) {
    author.value = null
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
      notFound.value = true
    } else {
      authorError.value = errorMessage(err)
    }
  } finally {
    loadingAuthor.value = false
  }
}

let requestId = 0

async function loadViews(): Promise<void> {
  if (authorId.value === '') return
  const current = ++requestId
  const requestedPage = page.value
  loadingViews.value = true
  viewsError.value = ''
  try {
    const result = await viewsService.listViews({
      autorId: authorId.value,
      page: requestedPage,
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
  void loadAuthor()
  void loadViews()
}

watch(authorId, (value) => {
  if (value === '') return
  reload()
})

watch(page, () => {
  if (route.name !== 'author') return
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
    <template v-if="notFound">
      <ErrorState message="Este autor no existe o su perfil ya no está disponible." />
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
      <header
        class="mb-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900"
      >
        <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-50">
          {{ author?.name ?? (loadingAuthor ? 'Cargando perfil…' : 'Autor') }}
        </h1>
        <p v-if="authorError" role="alert" class="mt-2 text-sm text-red-700 dark:text-red-400">
          {{ authorError }}
        </p>
        <dl v-else-if="author" class="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <dt class="text-stone-500 dark:text-stone-400">En la plataforma desde</dt>
            <dd class="font-medium text-stone-800 dark:text-stone-100">
              <time :datetime="author.createdAt">{{ formatDate(author.createdAt) }}</time>
            </dd>
          </div>
          <div>
            <dt class="text-stone-500 dark:text-stone-400">Publicaciones</dt>
            <dd class="font-medium text-stone-800 dark:text-stone-100">
              {{ author.publishedViewsCount }}
            </dd>
          </div>
        </dl>
      </header>

      <h2 class="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-50">
        Publicaciones de {{ author?.name ?? 'este autor' }}
      </h2>

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
        title="Este autor todavía no tiene publicaciones"
        description="Cuando publique una perspectiva, vas a verla acá."
      />

      <template v-else>
        <ViewsGrid :views="views" :loading="loadingViews" :skeleton-count="3" />
        <PaginationControls
          class="mt-8"
          :page="page"
          :limit="PAGE_LIMIT"
          :total="total"
          :disabled="loadingViews"
          @change="changePage"
        />
      </template>
    </template>
  </section>
</template>
