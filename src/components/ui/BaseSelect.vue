<script setup lang="ts">
import BaseField from './BaseField.vue'

export interface SelectOption {
  value: string
  label: string
}

defineProps<{
  label: string
  options: SelectOption[]
  error?: string
  hint?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
}>()

const model = defineModel<string>({ required: true })
</script>

<template>
  <BaseField v-slot="{ id, describedBy, invalid }" :label="label" :error="error" :hint="hint" :required="required">
    <select
      :id="id"
      v-model="model"
      :required="required"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      :aria-describedby="describedBy"
      class="w-full rounded-lg border bg-white px-3 py-2 text-sm text-stone-900 disabled:cursor-not-allowed disabled:bg-stone-100 dark:bg-stone-800 dark:text-stone-100 dark:disabled:bg-stone-900"
      :class="
        invalid
          ? 'border-red-500 dark:border-red-500'
          : 'border-stone-300 hover:border-stone-400 dark:border-stone-600 dark:hover:border-stone-500'
      "
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <option v-for="option in options" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>
  </BaseField>
</template>
