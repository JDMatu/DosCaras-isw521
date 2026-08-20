<script setup lang="ts">
/**
 * One of the two perspectives of a view (Postura / Contrapostura), with its
 * own reaction bar and its own sources — the two panels never share state.
 */
import ReactionBar from './ReactionBar.vue'
import SourcesList from './SourcesList.vue'
import type { ReactionResponse, ViewSide } from '@/types/api'

defineProps<{
  viewId: string
  side: ViewSide
  /** `a` = SIDE (Postura), `b` = COUNTERPART (Contrapostura). */
  sideKey: 'a' | 'b'
  heading: string
}>()

const emit = defineEmits<{ reaction: [ReactionResponse] }>()

const accentClasses: Record<'a' | 'b', string> = {
  a: 'border-amber-300 dark:border-amber-800',
  b: 'border-stone-300 dark:border-stone-600',
}

const badgeClasses: Record<'a' | 'b', string> = {
  a: 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200',
  b: 'bg-stone-200 text-stone-800 dark:bg-stone-700 dark:text-stone-100',
}
</script>

<template>
  <article
    class="flex flex-col gap-4 rounded-xl border-t-4 bg-white p-5 shadow-sm dark:bg-stone-900 dark:ring-1 dark:ring-stone-800"
    :class="accentClasses[sideKey]"
  >
    <header class="flex flex-col gap-2">
      <span
        class="w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide"
        :class="badgeClasses[sideKey]"
      >
        {{ heading }}
      </span>
      <h2 class="text-lg font-bold text-stone-900 dark:text-stone-50">{{ side.title }}</h2>
    </header>

    <p class="whitespace-pre-line text-sm leading-relaxed text-stone-700 dark:text-stone-200">
      {{ side.description }}
    </p>

    <ReactionBar
      :view-id="viewId"
      :side="sideKey"
      :side-label="heading"
      :like-count="side.likeCount"
      :dislike-count="side.dislikeCount"
      :my-reaction="side.myReaction"
      @update="emit('reaction', $event)"
    />

    <SourcesList :sources="side.sources" :side-label="heading" />
  </article>
</template>
