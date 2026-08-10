<script setup lang="ts">
import LoadingSpinner from './LoadingSpinner.vue'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
    type?: 'button' | 'submit'
    loading?: boolean
    disabled?: boolean
  }>(),
  { variant: 'primary', type: 'button', loading: false, disabled: false },
)

const variantClasses: Record<string, string> = {
  primary:
    'bg-amber-700 text-white hover:bg-amber-800 disabled:bg-amber-700/50 dark:bg-amber-600 dark:hover:bg-amber-500 dark:disabled:bg-amber-600/50',
  secondary:
    'border border-stone-300 bg-white text-stone-800 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700',
  danger:
    'bg-red-700 text-white hover:bg-red-800 disabled:bg-red-700/50 dark:bg-red-600 dark:hover:bg-red-500',
  ghost:
    'text-stone-700 hover:bg-stone-200/70 disabled:opacity-50 dark:text-stone-200 dark:hover:bg-stone-700/70',
}
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed"
    :class="variantClasses[variant]"
  >
    <LoadingSpinner v-if="loading" class="size-4" />
    <slot />
  </button>
</template>
