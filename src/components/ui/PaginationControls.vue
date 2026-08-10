<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  page: number
  limit: number
  total: number
  disabled?: boolean
}>()

const emit = defineEmits<{ change: [page: number] }>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)))
</script>

<template>
  <nav v-if="totalPages > 1" class="flex items-center justify-center gap-3" aria-label="Paginación">
    <button
      type="button"
      class="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
      :disabled="disabled || page <= 1"
      @click="emit('change', page - 1)"
    >
      ← Anterior
    </button>
    <p class="text-sm text-stone-600 dark:text-stone-300" aria-current="page">
      Página {{ page }} de {{ totalPages }}
    </p>
    <button
      type="button"
      class="rounded-lg border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
      :disabled="disabled || page >= totalPages"
      @click="emit('change', page + 1)"
    >
      Siguiente →
    </button>
  </nav>
</template>
