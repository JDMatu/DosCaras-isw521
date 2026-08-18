<script setup lang="ts">

import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { PoliticalView } from '@/types/api'
import { formatDate, truncate } from '@/lib/format'
import FavoriteButton from './FavoriteButton.vue'
import ShareButton from './ShareButton.vue'

const props = defineProps<{ view: PoliticalView }>()

const side = computed(() => props.view.sides.find((s) => s.type === 'SIDE'))
const counterpart = computed(() => props.view.sides.find((s) => s.type === 'COUNTERPART'))
</script>

<template>
  <article class="flex flex-col rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-stone-700 dark:bg-stone-900">
    <div class="mb-2 flex items-center justify-between gap-2">
      <RouterLink
        :to="{ name: 'category', params: { id: view.category.id } }"
        class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200 dark:hover:bg-amber-900"
      >
        {{ view.category.name }}
      </RouterLink>
      <div class="flex items-center">
        <span
          v-if="view.status === 'UNPUBLISHED'"
          class="mr-1 rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-700 dark:text-stone-300"
        >
          Despublicada
        </span>
        <ShareButton :view-id="view.id" :title="side?.title ?? 'Las Dos Caras'" />
        <FavoriteButton :view-id="view.id" />
      </div>
    </div>

    <h3 class="mb-1 font-semibold text-stone-900 dark:text-stone-50">
      <RouterLink
        :to="{ name: 'view-detail', params: { id: view.id } }"
        class="rounded-sm hover:text-amber-700 dark:hover:text-amber-400"
      >
        {{ side?.title ?? 'Publicación' }}
      </RouterLink>
    </h3>
    <p v-if="counterpart" class="mb-2 text-sm font-medium text-stone-500 dark:text-stone-400">
      vs. {{ counterpart.title }}
    </p>
    <p v-if="side" class="mb-4 flex-1 text-sm text-stone-600 dark:text-stone-300">
      {{ truncate(side.description, 160) }}
    </p>

    <ul v-if="view.hashtags.length" class="mb-3 flex flex-wrap gap-1.5" aria-label="Hashtags">
      <li
        v-for="tag in view.hashtags"
        :key="tag.id"
        class="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300"
      >
        #{{ tag.name }}
      </li>
    </ul>

    <div class="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
      <p>
        Por
        <RouterLink
          :to="{ name: 'author', params: { id: view.author.id } }"
          class="font-medium text-amber-800 hover:underline dark:text-amber-400"
        >
          {{ view.author.name }}
        </RouterLink>
        · <time :datetime="view.createdAt">{{ formatDate(view.createdAt) }}</time>
      </p>
      <p class="flex items-center gap-3">
        <span :aria-label="`Postura: ${side?.likeCount ?? 0} me gusta`">
          <span aria-hidden="true">👍 A</span> {{ side?.likeCount ?? 0 }}
        </span>
        <span :aria-label="`Contrapostura: ${counterpart?.likeCount ?? 0} me gusta`">
          <span aria-hidden="true">👍 B</span> {{ counterpart?.likeCount ?? 0 }}
        </span>
        <span :aria-label="`${view._count.threads} hilos de comentarios`">
          <span aria-hidden="true">💬</span> {{ view._count.threads }}
        </span>
      </p>
    </div>
  </article>
</template>
