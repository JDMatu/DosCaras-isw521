<script setup lang="ts">

import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import HighlightedText from '@/components/board/HighlightedText.vue'
import SearchResultCard from '@/components/board/SearchResultCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { errorMessage } from '@/lib/http'
import * as searchService from '@/services/search'
import { useConnectionStore } from '@/stores/connection'
import type { SearchResponse } from '@/types/api'

const route = useRoute()
const router = useRouter()
const connection = useConnectionStore()

const queryTerm = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''))

const inputTerm = ref(queryTerm.value)
const debouncedTerm = useDebouncedRef(queryTerm.value, 300)

const results = ref<SearchResponse | null>(null)
const loading = ref(false)
const error = ref('')

const totalResults = computed(() => {
  const value = results.value
  if (!value) return 0
  return value.views.length + value.categories.length + value.hashtags.length + value.authors.length
})

function goToTerm(term: string): void {
  const trimmed = term.trim()
  if (trimmed === queryTerm.value) return
  void router.replace({ name: 'search', query: trimmed === '' ? {} : { q: trimmed } })
}

let requestId = 0

async function runSearch(): Promise<void> {
  const term = queryTerm.value
  const current = ++requestId
  if (term === '') {
    results.value = null
    error.value = ''
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    const response = await searchService.search(term)
    if (current !== requestId) return
    results.value = response
  } catch (err) {
    if (current !== requestId) return
    results.value = null
    error.value = errorMessage(err)
  } finally {
    if (current === requestId) loading.value = false
  }
}

watch(inputTerm, (value) => {
  debouncedTerm.value = value
})

watch(debouncedTerm, (value) => {
  goToTerm(value)
})

watch(queryTerm, (value) => {
  // Keep the field in sync when the term changes from outside (navbar search,
  // browser back/forward). The debounce guard above stops the feedback loop.
  if (value !== inputTerm.value) inputTerm.value = value
  void runSearch()
})

watch(
  () => connection.becameOnline,
  () => {
    void runSearch()
  },
)

/** Enter skips the debounce so the search feels immediate. */
function submit(): void {
  goToTerm(inputTerm.value)
}

onMounted(() => {
  void runSearch()
})
</script>

<template>
  <section>
    <h1 class="mb-1 text-2xl font-bold text-stone-900 dark:text-stone-50">
      <template v-if="queryTerm">Resultados para: “{{ queryTerm }}”</template>
      <template v-else>Búsqueda</template>
    </h1>
    <p v-if="queryTerm && !loading && results" class="mb-6 text-sm text-stone-600 dark:text-stone-300">
      {{ totalResults }} {{ totalResults === 1 ? 'resultado encontrado' : 'resultados encontrados' }}
    </p>
    <p v-else class="mb-6 text-sm text-stone-600 dark:text-stone-300">
      Buscá publicaciones, categorías, hashtags y autores.
    </p>

    <form role="search" class="mb-8" @submit.prevent="submit">
      <label for="search-term" class="mb-1.5 block text-sm font-medium text-stone-800 dark:text-stone-200">
        Refinar búsqueda
      </label>
      <div class="flex gap-2">
        <input
          id="search-term"
          v-model="inputTerm"
          type="search"
          autocomplete="off"
          placeholder="ej. impuestos"
          class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 hover:border-stone-400 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500 dark:hover:border-stone-500"
        />
      </div>
    </form>

    <p class="sr-only" role="status" aria-live="polite">
      {{ loading ? 'Buscando…' : `${totalResults} resultados encontrados.` }}
    </p>

    <EmptyState
      v-if="!queryTerm"
      title="Escribí un término para comenzar"
      description="Ingresá al menos una palabra en el campo de búsqueda para ver publicaciones, categorías, hashtags y autores relacionados."
    />

    <div v-else-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <SkeletonCard v-for="index in 3" :key="`skeleton-${index}`" />
    </div>

    <ErrorState v-else-if="error" :message="error" retryable @retry="runSearch" />

    <EmptyState
      v-else-if="totalResults === 0"
      :title="`No se encontraron resultados para «${queryTerm}»`"
      description="Probá con menos palabras, revisá la ortografía o buscá por el nombre de una categoría o un hashtag."
    >
      <RouterLink
        :to="{ name: 'board' }"
        class="text-sm font-medium text-amber-800 hover:underline dark:text-amber-400"
      >
        Ver todas las publicaciones
      </RouterLink>
    </EmptyState>

    <div v-else-if="results" class="flex flex-col gap-10">
      <section v-if="results.views.length" aria-labelledby="search-views-heading">
        <h2
          id="search-views-heading"
          class="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-50"
        >
          Publicaciones ({{ results.views.length }})
        </h2>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SearchResultCard
            v-for="result in results.views"
            :key="result.id"
            :result="result"
            :term="queryTerm"
          />
        </div>
      </section>

      <section v-if="results.categories.length" aria-labelledby="search-categories-heading">
        <h2
          id="search-categories-heading"
          class="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-50"
        >
          Categorías ({{ results.categories.length }})
        </h2>
        <ul class="flex flex-wrap gap-2">
          <li v-for="item in results.categories" :key="item.id">
            <RouterLink
              :to="{ name: 'category', params: { id: item.id } }"
              class="inline-block rounded-full bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200 dark:hover:bg-amber-900"
            >
              <HighlightedText :text="item.name" :term="queryTerm" />
            </RouterLink>
          </li>
        </ul>
      </section>

      <section v-if="results.hashtags.length" aria-labelledby="search-hashtags-heading">
        <h2
          id="search-hashtags-heading"
          class="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-50"
        >
          Hashtags ({{ results.hashtags.length }})
        </h2>
        <ul class="flex flex-wrap gap-2">
          <li v-for="tag in results.hashtags" :key="tag.id">
            <RouterLink
              :to="{ name: 'board', query: { hashtag: tag.name } }"
              class="inline-block rounded-full bg-stone-100 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
            >
              #<HighlightedText :text="tag.name" :term="queryTerm" />
            </RouterLink>
          </li>
        </ul>
      </section>

      <section v-if="results.authors.length" aria-labelledby="search-authors-heading">
        <h2
          id="search-authors-heading"
          class="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-50"
        >
          Autores ({{ results.authors.length }})
        </h2>
        <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="person in results.authors" :key="person.id">
            <RouterLink
              :to="{ name: 'author', params: { id: person.id } }"
              class="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm shadow-sm hover:shadow-md dark:border-stone-700 dark:bg-stone-900"
            >
              <span
                class="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-700 text-sm font-bold text-white dark:bg-amber-600"
                aria-hidden="true"
              >
                {{ person.name.charAt(0).toUpperCase() }}
              </span>
              <span class="font-medium text-stone-800 dark:text-stone-100">
                <HighlightedText :text="person.name" :term="queryTerm" />
              </span>
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>
