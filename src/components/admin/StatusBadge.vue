<script setup lang="ts">
export type BadgeTone = 'green' | 'red' | 'amber' | 'gray'

defineProps<{ tone: BadgeTone }>()

const TONE_CLASSES: Record<BadgeTone, string> = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200',
  amber: 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200',
  gray: 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200',
}
</script>

<template>
  <span
    class="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="TONE_CLASSES[tone]"
  >
    <slot />
  </span>
</template>
