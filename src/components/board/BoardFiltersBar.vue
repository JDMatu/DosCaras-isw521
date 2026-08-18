<script setup lang="ts">

import { computed, ref, useId, watch } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import type { BoardSort } from '@/stores/filters'
import type { Category, Hashtag } from '@/types/api'

interface SelectOption {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    categories?: Category[]
    hashtagSuggestions?: Hashtag[]
    showCategory?: boolean
    disabled?: boolean
    canClear?: boolean
  }>(),
  {
    categories: () => [],
    hashtagSuggestions: () => [],
    showCategory: true,
    disabled: false,
    canClear: false,
  },
)

const category = defineModel<string>('category', { default: '' })
const hashtag = defineModel<string>('hashtag', { required: true })
const sort = defineModel<BoardSort>('sort', { required: true })

const emit = defineEmits<{ clear: [] }>()

const datalistId = useId()

// The hashtag is applied on submit rather than on every keystroke: it would
// otherwise fire one request (and one history entry) per typed character.
const hashtagDraft = ref(hashtag.value)
watch(hashtag, (value) => {
  hashtagDraft.value = value
})

const categoryOptions = computed<SelectOption[]>(() => [
  { value: '', label: 'Todas las categorías' },
  ...props.categories.map((item) => ({ value: item.id, label: item.name })),
])

const sortOptions: SelectOption[] = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'likes', label: 'Más me gusta' },
  { value: 'dislikes', label: 'Más no me gusta' },
]

/** BaseSelect models plain strings; narrow back to the union on write. */
const sortProxy = computed<string>({
  get: () => sort.value,
  set: (value) => {
    if (value === 'recent' || value === 'likes' || value === 'dislikes') {
      sort.value = value
    }
  },
})

function apply(): void {
  // The API normalises hashtags to lowercase without '#'; do the same here so
  // the URL and the request agree with what the backend stores.
  hashtag.value = hashtagDraft.value.trim().replace(/^#+/, '').toLowerCase()
}
</script>

<template>
  <form
    class="mb-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900"
    @submit.prevent="apply"
  >
    <h2 class="sr-only">Filtros de publicaciones</h2>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2" :class="showCategory ? 'lg:grid-cols-4' : 'lg:grid-cols-3'">
      <BaseSelect
        v-if="showCategory"
        v-model="category"
        label="Categoría"
        :options="categoryOptions"
        :disabled="disabled"
      />

      <BaseField
        v-slot="{ id, describedBy }"
        label="Hashtag"
        hint="Se filtra por un hashtag a la vez."
      >
        <input
          :id="id"
          v-model="hashtagDraft"
          type="search"
          :list="datalistId"
          :disabled="disabled"
          :aria-describedby="describedBy"
          placeholder="ej. economia"
          class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 hover:border-stone-400 disabled:cursor-not-allowed disabled:bg-stone-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500 dark:hover:border-stone-500 dark:disabled:bg-stone-900"
        />
      </BaseField>

      <BaseSelect
        v-model="sortProxy"
        label="Ordenar por"
        :options="sortOptions"
        :disabled="disabled"
      />

      <div class="flex items-end gap-2">
        <BaseButton type="submit" :disabled="disabled">Filtrar</BaseButton>
        <BaseButton
          v-if="canClear"
          type="button"
          variant="secondary"
          :disabled="disabled"
          @click="emit('clear')"
        >
          Limpiar
        </BaseButton>
      </div>
    </div>

    <datalist :id="datalistId">
      <option v-for="tag in hashtagSuggestions" :key="tag.id" :value="tag.name" />
    </datalist>
  </form>
</template>
