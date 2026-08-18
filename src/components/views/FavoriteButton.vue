<script setup lang="ts">

import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useFavoritesStore } from '@/stores/favorites'
import { useToastsStore } from '@/stores/toasts'
import { errorMessage } from '@/lib/http'

const props = defineProps<{ viewId: string }>()

const auth = useAuthStore()
const favorites = useFavoritesStore()
const toasts = useToastsStore()

const pending = ref(false)
const isFavorite = computed(() => favorites.isFavorite(props.viewId))

async function toggle(): Promise<void> {
  if (pending.value) return
  pending.value = true
  try {
    const added = await favorites.toggle(props.viewId)
    toasts.success(added ? 'Publicación guardada en favoritos.' : 'Publicación quitada de favoritos.')
  } catch (err) {
    toasts.error(errorMessage(err))
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <button v-if="auth.isAuthenticated" type="button" class="rounded-md p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    :class="
      isFavorite
        ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50'
        : 'text-stone-400 hover:bg-stone-100 hover:text-red-500 dark:text-stone-500 dark:hover:bg-stone-800'
    "
    :disabled="pending"
    :aria-pressed="isFavorite"
    :aria-label="isFavorite ? 'Quitar de favoritos' : 'Guardar en favoritos'"
    @click.prevent.stop="toggle"
  >
    <svg viewBox="0 0 24 24" :fill="isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" class="size-5" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  </button>
</template>
