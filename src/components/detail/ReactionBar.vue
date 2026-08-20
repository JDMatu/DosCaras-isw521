<script setup lang="ts">
/**
 * Like/dislike bar for ONE side of a view. Each side keeps its own counters,
 * so this component is mounted twice per detail page with independent state.
 *
 * API divergence (verified against the backend):
 * `POST /api/views/:id/sides/{a|b}/{like|dislike}` is an UPSERT and there is
 * NO DELETE endpoint for reactions — a reaction can be switched
 * (like <-> dislike) but never removed. Pressing the already-active reaction
 * would just re-send the same value, so that button is rendered disabled with
 * `aria-pressed="true"` instead of acting as a toggle.
 */
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { errorMessage } from '@/lib/http'
import * as viewsService from '@/services/views'
import { useAuthStore } from '@/stores/auth'
import { useToastsStore } from '@/stores/toasts'
import type { ReactionResponse, ReactionType } from '@/types/api'

const props = defineProps<{
  viewId: string
  /** `a` = SIDE (Postura), `b` = COUNTERPART (Contrapostura). */
  side: 'a' | 'b'
  sideLabel: string
  likeCount: number
  dislikeCount: number
  myReaction: ReactionType | null
}>()

const emit = defineEmits<{ update: [ReactionResponse] }>()

const route = useRoute()
const auth = useAuthStore()
const toasts = useToastsStore()

const pending = ref<'like' | 'dislike' | null>(null)

const liked = computed(() => props.myReaction === 'LIKE')
const disliked = computed(() => props.myReaction === 'DISLIKE')

const loginTarget = computed(() => ({
  name: 'login' as const,
  query: { redirect: route.fullPath },
}))

function disabledFor(kind: 'like' | 'dislike'): boolean {
  if (!auth.isAuthenticated) return true
  if (pending.value !== null) return true
  return kind === 'like' ? liked.value : disliked.value
}

function hintFor(kind: 'like' | 'dislike'): string {
  if (!auth.isAuthenticated) return 'Iniciá sesión para reaccionar'
  if (kind === 'like' && liked.value) return 'Ya marcaste "me gusta" en esta postura'
  if (kind === 'dislike' && disliked.value) return 'Ya marcaste "no me gusta" en esta postura'
  return kind === 'like' ? `Me gusta ${props.sideLabel}` : `No me gusta ${props.sideLabel}`
}

async function react(kind: 'like' | 'dislike'): Promise<void> {
  if (disabledFor(kind)) return
  pending.value = kind
  try {
    const response = await viewsService.react(props.viewId, props.side, kind)
    emit('update', response)
  } catch (err) {
    toasts.error(errorMessage(err))
  } finally {
    pending.value = null
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      class="flex flex-wrap items-center gap-2"
      role="group"
      :aria-label="`Reacciones de ${sideLabel}`"
    >
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed"
        :class="
          liked
            ? 'border-green-500 bg-green-50 text-green-800 disabled:opacity-100 dark:border-green-600 dark:bg-green-950 dark:text-green-200'
            : 'border-stone-300 bg-white text-stone-700 hover:border-green-400 hover:bg-green-50 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:border-green-600 dark:hover:bg-green-950/50'
        "
        :aria-pressed="liked"
        :disabled="disabledFor('like')"
        :title="hintFor('like')"
        :aria-label="`${hintFor('like')}. ${likeCount} me gusta`"
        @click="react('like')"
      >
        <LoadingSpinner v-if="pending === 'like'" class="size-4" />
        <span v-else aria-hidden="true">👍</span>
        <span aria-hidden="true">{{ likeCount }}</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:cursor-not-allowed"
        :class="
          disliked
            ? 'border-red-500 bg-red-50 text-red-800 disabled:opacity-100 dark:border-red-600 dark:bg-red-950 dark:text-red-200'
            : 'border-stone-300 bg-white text-stone-700 hover:border-red-400 hover:bg-red-50 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:border-red-600 dark:hover:bg-red-950/50'
        "
        :aria-pressed="disliked"
        :disabled="disabledFor('dislike')"
        :title="hintFor('dislike')"
        :aria-label="`${hintFor('dislike')}. ${dislikeCount} no me gusta`"
        @click="react('dislike')"
      >
        <LoadingSpinner v-if="pending === 'dislike'" class="size-4" />
        <span v-else aria-hidden="true">👎</span>
        <span aria-hidden="true">{{ dislikeCount }}</span>
      </button>
    </div>

    <p v-if="!auth.isAuthenticated" class="text-xs text-stone-500 dark:text-stone-400">
      <RouterLink
        :to="loginTarget"
        class="font-medium text-amber-800 hover:underline dark:text-amber-400"
      >
        Iniciá sesión
      </RouterLink>
      para reaccionar.
    </p>
    <p v-else-if="myReaction !== null" class="text-xs text-stone-500 dark:text-stone-400">
      Podés cambiar tu reacción, pero el servidor no permite quitarla.
    </p>
  </div>
</template>
