<script setup lang="ts">

import SkeletonCard from '@/components/ui/SkeletonCard.vue'
import ViewCard from '@/components/views/ViewCard.vue'
import type { PoliticalView } from '@/types/api'

withDefaults(
  defineProps<{
    views: PoliticalView[]
    loading?: boolean
    skeletonCount?: number
  }>(),
  { loading: false, skeletonCount: 6 },
)
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" :aria-busy="loading || undefined">
    <template v-if="loading">
      <SkeletonCard v-for="index in skeletonCount" :key="`skeleton-${index}`" />
    </template>
    <ViewCard v-for="view in views" v-else :key="view.id" :view="view" />
  </div>
</template>
