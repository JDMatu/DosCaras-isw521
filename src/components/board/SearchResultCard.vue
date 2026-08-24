<script setup lang="ts">

import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { formatDate } from '@/lib/format'
import type { SearchViewResult } from '@/types/api'
import HighlightedText from './HighlightedText.vue'

const props = defineProps<{ result: SearchViewResult; term: string }>()

const side = computed(() => props.result.sides.find((item) => item.type === 'SIDE'))
const counterpart = computed(() => props.result.sides.find((item) => item.type === 'COUNTERPART'))
</script>

<template>
  <article
    class="flex flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-700 dark:bg-stone-900"
  >
    <div class="mb-2">
      <RouterLink
        :to="{ name: 'category', params: { id: result.category.id } }"
        class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200 dark:hover:bg-amber-900"
      >
        <HighlightedText :text="result.category.name" :term="term" />
      </RouterLink>
    </div>

    <h3 class="mb-1 font-semibold text-stone-900 dark:text-stone-50">
      <RouterLink
        :to="{ name: 'view-detail', params: { id: result.id } }"
        class="rounded-sm hover:text-amber-700 dark:hover:text-amber-400"
      >
        <HighlightedText :text="side?.title ?? 'Publicación'" :term="term" />
      </RouterLink>
    </h3>
    <p v-if="counterpart" class="mb-3 text-sm font-medium text-stone-500 dark:text-stone-400">
      vs. <HighlightedText :text="counterpart.title" :term="term" />
    </p>

    <p
      class="mt-auto border-t border-stone-100 pt-3 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400"
    >
      Por
      <RouterLink
        :to="{ name: 'author', params: { id: result.author.id } }"
        class="font-medium text-amber-800 hover:underline dark:text-amber-400"
      >
        <HighlightedText :text="result.author.name" :term="term" />
      </RouterLink>
      · <time :datetime="result.createdAt">{{ formatDate(result.createdAt) }}</time>
    </p>
  </article>
</template>
