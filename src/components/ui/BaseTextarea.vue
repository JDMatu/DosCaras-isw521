<script setup lang="ts">
import BaseField from './BaseField.vue'

withDefaults(
  defineProps<{
    label: string
    error?: string
    hint?: string
    required?: boolean
    placeholder?: string
    rows?: number
    disabled?: boolean
  }>(),
  { rows: 4 },
)

const model = defineModel<string>({ required: true })
</script>

<template>
  <BaseField v-slot="{ id, describedBy, invalid }" :label="label" :error="error" :hint="hint" :required="required">
    <textarea
      :id="id"
      v-model="model"
      :rows="rows"
      :required="required"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      :aria-describedby="describedBy"
      class="w-full rounded-lg border bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 disabled:cursor-not-allowed disabled:bg-stone-100 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500 dark:disabled:bg-stone-900"
      :class="
        invalid
          ? 'border-red-500 dark:border-red-500'
          : 'border-stone-300 hover:border-stone-400 dark:border-stone-600 dark:hover:border-stone-500'
      "
    ></textarea>
  </BaseField>
</template>
