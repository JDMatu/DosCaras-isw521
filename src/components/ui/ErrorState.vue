<script setup lang="ts">
import BaseButton from './BaseButton.vue'

defineProps<{
  message: string
  retryable?: boolean
}>()

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div
    role="alert"
    class="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-900 dark:bg-red-950/40"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="size-10 text-red-600 dark:text-red-400" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
    <p class="max-w-md text-sm text-red-800 dark:text-red-200">{{ message }}</p>
    <BaseButton v-if="retryable" variant="secondary" @click="emit('retry')">Reintentar</BaseButton>
  </div>
</template>
