<script setup lang="ts">

import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import PaginationControls from '@/components/ui/PaginationControls.vue'
import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import ViewCard from '@/components/views/ViewCard.vue'
import { errorMessage } from '@/lib/http'
import * as viewsService from '@/services/views'
import type { PoliticalView } from '@/types/api'

const LIMIT = 6

const views = ref<PoliticalView[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const error = ref('')

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const response = await viewsService.listViews({ autor: 'me', page: page.value, limit: LIMIT })
    views.value = response.views
    total.value = response.total
  } catch (err) {
    error.value = errorMessage(err)
    views.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function goToPage(next: number): void {
  page.value = next
  void load()
}

onMounted(load)
</script>

<template>
  <section aria-label="Mis publicaciones">
    <div v-if="loading" class="grid gap-4 sm:grid-cols-2">
      <SkeletonCard v-for="n in 4" :key="n" />
      <p class="sr-only" role="status">Cargando tus publicaciones…</p>
    </div>

    <ErrorState v-else-if="error" :message="error" retryable @retry="load" />

    <EmptyState
      v-else-if="views.length === 0"
      title="Todavía no publicaste nada"
      description="Compartí un tema con sus dos caras: una postura, una contrapostura y sus fuentes."
    >
      <RouterLink
        :to="{ name: 'view-create' }"
        class="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
      >
        Creá tu primera publicación
      </RouterLink>
    </EmptyState>

    <div v-else class="flex flex-col gap-6">
      <p class="text-sm text-stone-500 dark:text-stone-400">
        {{ total }} {{ total === 1 ? 'publicación publicada' : 'publicaciones publicadas' }}. Si un
        administrador despublicó alguna de tus publicaciones, el API no la devuelve en este listado.
      </p>
      <ul class="grid list-none gap-4 sm:grid-cols-2">
        <li v-for="view in views" :key="view.id" class="flex flex-col gap-2">
          <ViewCard :view="view" />
          <div class="flex justify-end">
            <RouterLink
              :to="{ name: 'view-edit', params: { id: view.id } }"
              class="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Editar publicación
            </RouterLink>
          </div>
        </li>
      </ul>
      <PaginationControls
        :page="page"
        :limit="LIMIT"
        :total="total"
        :disabled="loading"
        @change="goToPage"
      />
    </div>
  </section>
</template>
