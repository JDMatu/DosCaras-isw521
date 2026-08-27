<script setup lang="ts">

import { onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import ViewCard from '@/components/views/ViewCard.vue'
import { errorMessage } from '@/lib/http'
import * as viewsService from '@/services/views'
import { useFavoritesStore } from '@/stores/favorites'
import type { PoliticalView } from '@/types/api'

const MAX_DETAILS = 30

const favorites = useFavoritesStore()

const views = ref<PoliticalView[]>([])
const loading = ref(false)
const error = ref('')
const skipped = ref(0)
const attempted = ref<Set<string>>(new Set())

function targetIds(): string[] {
  return [...favorites.ids].slice(0, MAX_DETAILS)
}

async function load(): Promise<void> {
  const ids = targetIds()
  attempted.value = new Set(ids)
  if (ids.length === 0) {
    views.value = []
    skipped.value = 0
    error.value = ''
    return
  }
  loading.value = true
  error.value = ''
  try {
    const results = await Promise.allSettled(ids.map((id) => viewsService.getView(id)))
    const loaded: PoliticalView[] = []
    let firstFailure: unknown = null
    for (const result of results) {
      if (result.status === 'fulfilled') loaded.push(result.value.view)
      else if (firstFailure === null) firstFailure = result.reason
    }
    skipped.value = ids.length - loaded.length
    if (loaded.length === 0 && firstFailure !== null) {
      error.value = errorMessage(firstFailure)
    }
    views.value = loaded
  } finally {
    loading.value = false
  }
}

// The heart inside ViewCard writes to the favorites store: drop unfavorited
// cards immediately and pull in ids added elsewhere (e.g. the login sync).
watch(
  () => favorites.ids,
  (ids) => {
    views.value = views.value.filter((view) => ids.has(view.id))
    const pending = [...ids].slice(0, MAX_DETAILS).some((id) => !attempted.value.has(id))
    if (pending) void load()
  },
)

onMounted(load)
</script>

<template>
  <section aria-label="Mis favoritos">
    <div v-if="loading" class="grid gap-4 sm:grid-cols-2">
      <SkeletonCard v-for="n in 4" :key="n" />
      <p class="sr-only" role="status">Cargando tus favoritos…</p>
    </div>

    <ErrorState v-else-if="error" :message="error" retryable @retry="load" />

    <EmptyState
      v-else-if="views.length === 0"
      title="Todavía no guardaste favoritos"
      description="Tocá el corazón de cualquier publicación para guardarla acá y volver a leerla cuando quieras."
    >
      <RouterLink
        :to="{ name: 'board' }"
        class="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
      >
        Explorar el tablero
      </RouterLink>
    </EmptyState>

    <div v-else class="flex flex-col gap-4">
      <p v-if="skipped > 0" class="text-sm text-stone-500 dark:text-stone-400">
        {{ skipped }}
        {{
          skipped === 1
            ? 'favorito no está disponible (puede haber sido despublicado).'
            : 'favoritos no están disponibles (pueden haber sido despublicados).'
        }}
      </p>
      <p v-if="favorites.ids.size > MAX_DETAILS" class="text-sm text-stone-500 dark:text-stone-400">
        Mostrando los primeros {{ MAX_DETAILS }} de {{ favorites.ids.size }} favoritos.
      </p>
      <ul class="grid list-none gap-4 sm:grid-cols-2">
        <li v-for="view in views" :key="view.id">
          <ViewCard :view="view" />
        </li>
      </ul>
    </div>
  </section>
</template>
