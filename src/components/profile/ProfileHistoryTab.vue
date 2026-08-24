<script setup lang="ts">

import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { formatDateTime } from '@/lib/format'
import { useHistoryStore } from '@/stores/history'
import { useToastsStore } from '@/stores/toasts'

const history = useHistoryStore()
const toasts = useToastsStore()

const confirmOpen = ref(false)

function clearHistory(): void {
  history.clear()
  confirmOpen.value = false
  toasts.success('Historial de lectura limpiado.')
}
</script>

<template>
  <section aria-label="Historial de publicaciones vistas">
    <EmptyState
      v-if="history.entries.length === 0"
      title="Tu historial está vacío"
      description="Acá vas a ver las últimas 20 publicaciones que abriste, guardadas solo en este navegador."
    >
      <RouterLink
        :to="{ name: 'board' }"
        class="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
      >
        Ir al tablero
      </RouterLink>
    </EmptyState>

    <div v-else class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Últimas {{ history.entries.length }}
          {{ history.entries.length === 1 ? 'publicación vista' : 'publicaciones vistas' }} en este
          navegador.
        </p>
        <BaseButton variant="secondary" @click="confirmOpen = true">Limpiar historial</BaseButton>
      </div>

      <ul class="divide-y divide-stone-200 rounded-xl border border-stone-200 dark:divide-stone-700 dark:border-stone-700">
        <li
          v-for="entry in history.entries"
          :key="entry.id"
          class="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <div class="min-w-0">
            <RouterLink
              :to="{ name: 'view-detail', params: { id: entry.id } }"
              class="font-medium text-stone-900 hover:text-amber-700 dark:text-stone-100 dark:hover:text-amber-400"
            >
              {{ entry.titulo }}
            </RouterLink>
            <p class="text-xs text-stone-500 dark:text-stone-400">{{ entry.categoria }}</p>
          </div>
          <time
            :datetime="entry.fechaVista"
            class="shrink-0 text-xs text-stone-500 dark:text-stone-400"
          >
            {{ formatDateTime(entry.fechaVista) }}
          </time>
        </li>
      </ul>
    </div>

    <ConfirmDialog
      :open="confirmOpen"
      title="Limpiar historial"
      message="Se van a borrar las publicaciones vistas recientemente guardadas en este navegador. Esta acción no afecta tus favoritos ni tus publicaciones."
      confirm-label="Limpiar"
      danger
      @confirm="clearHistory"
      @cancel="confirmOpen = false"
    />
  </section>
</template>
