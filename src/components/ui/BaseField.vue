<script setup lang="ts">
import { computed, useId } from 'vue'

const props = defineProps<{
  label: string
  error?: string
  hint?: string
  required?: boolean
}>()

const id = useId()
const errorId = `${id}-error`
const hintId = `${id}-hint`

const describedBy = computed(() => {
  const ids: string[] = []
  if (props.hint) ids.push(hintId)
  if (props.error) ids.push(errorId)
  return ids.length ? ids.join(' ') : undefined
})
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="text-sm font-medium text-stone-800 dark:text-stone-200">
      {{ label }}
      <span v-if="required" aria-hidden="true" class="text-red-600 dark:text-red-400">*</span>
    </label>
    <slot :id="id" :described-by="describedBy" :invalid="Boolean(error)" />
    <p v-if="hint && !error" :id="hintId" class="text-xs text-stone-500 dark:text-stone-400">
      {{ hint }}
    </p>
    <p v-if="error" :id="errorId" class="text-sm text-red-700 dark:text-red-400" role="alert">
      {{ error }}
    </p>
  </div>
</template>
