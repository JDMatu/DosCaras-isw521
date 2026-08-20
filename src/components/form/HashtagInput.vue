<script setup lang="ts">
/**
 * Tag input for hashtags with autocomplete from `GET /api/hashtags?q=`.
 *
 * The API normalises hashtags to lowercase without a leading `#` (and rejects
 * more than 10 per view, 50 characters each), so the same normalisation is
 * applied here and the chips are displayed exactly as they will be stored.
 */
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import * as hashtagsService from '@/services/hashtags'

const props = withDefaults(
  defineProps<{
    label: string
    error?: string
    disabled?: boolean
    max?: number
    maxLength?: number
  }>(),
  { max: 10, maxLength: 50, error: undefined },
)

const model = defineModel<string[]>({ required: true })

const baseId = useId()
const inputId = `${baseId}-input`
const listId = `${baseId}-list`
const hintId = `${baseId}-hint`
const errorId = `${baseId}-error`

const query = ref('')
const suggestions = ref<string[]>([])
const open = ref(false)
const activeIndex = ref(-1)
const localError = ref('')

let debounceTimer: ReturnType<typeof setTimeout> | undefined
let requestToken = 0

const isFull = computed(() => model.value.length >= props.max)

const describedBy = computed(() => {
  const ids = [hintId]
  if (props.error !== undefined || localError.value !== '') ids.push(errorId)
  return ids.join(' ')
})

const shownError = computed(() => props.error ?? (localError.value === '' ? undefined : localError.value))

/** API rule: trim, drop leading `#`, lowercase. */
function normalize(raw: string): string {
  return raw.trim().replace(/^#+/, '').trim().toLowerCase()
}

function add(raw: string): void {
  const value = normalize(raw)
  if (value === '') return
  if (value.length > props.maxLength) {
    localError.value = `Cada hashtag puede tener hasta ${props.maxLength} caracteres.`
    return
  }
  if (model.value.includes(value)) {
    localError.value = `El hashtag «${value}» ya está agregado.`
    query.value = ''
    return
  }
  if (isFull.value) {
    localError.value = `Podés agregar hasta ${props.max} hashtags.`
    return
  }
  localError.value = ''
  model.value = [...model.value, value]
  query.value = ''
  suggestions.value = []
  open.value = false
  activeIndex.value = -1
}

function remove(value: string): void {
  model.value = model.value.filter((tag) => tag !== value)
  localError.value = ''
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    const active = suggestions.value[activeIndex.value]
    add(activeIndex.value >= 0 && active !== undefined ? active : query.value)
    return
  }
  if (event.key === 'Backspace' && query.value === '') {
    const last = model.value[model.value.length - 1]
    if (last !== undefined) remove(last)
    return
  }
  if (event.key === 'ArrowDown' && suggestions.value.length > 0) {
    event.preventDefault()
    open.value = true
    activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
    return
  }
  if (event.key === 'ArrowUp' && suggestions.value.length > 0) {
    event.preventDefault()
    open.value = true
    activeIndex.value =
      activeIndex.value <= 0 ? suggestions.value.length - 1 : activeIndex.value - 1
    return
  }
  if (event.key === 'Escape') {
    open.value = false
    activeIndex.value = -1
  }
}

async function fetchSuggestions(term: string): Promise<void> {
  const token = ++requestToken
  try {
    const { hashtags } = await hashtagsService.listHashtags(term)
    if (token !== requestToken) return
    suggestions.value = hashtags
      .map((tag) => tag.name)
      .filter((name) => !model.value.includes(name))
      .slice(0, 8)
    open.value = suggestions.value.length > 0
    activeIndex.value = -1
  } catch {
    // Autocomplete is a convenience: a failed lookup must not block typing.
    if (token === requestToken) {
      suggestions.value = []
      open.value = false
    }
  }
}

watch(query, (value) => {
  localError.value = ''
  clearTimeout(debounceTimer)
  const term = normalize(value)
  if (term === '') {
    suggestions.value = []
    open.value = false
    activeIndex.value = -1
    return
  }
  debounceTimer = setTimeout(() => void fetchSuggestions(term), 300)
})

onBeforeUnmount(() => clearTimeout(debounceTimer))
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="inputId" class="text-sm font-medium text-stone-800 dark:text-stone-200">
      {{ label }}
    </label>

    <ul v-if="model.length > 0" class="flex flex-wrap gap-1.5" aria-label="Hashtags agregados">
      <li
        v-for="tag in model"
        :key="tag"
        class="inline-flex items-center gap-1 rounded-full bg-stone-100 py-0.5 pl-2.5 pr-1 text-xs text-stone-700 dark:bg-stone-800 dark:text-stone-200"
      >
        #{{ tag }}
        <button
          type="button"
          class="rounded-full p-0.5 text-stone-500 hover:bg-stone-200 hover:text-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-100"
          :disabled="disabled"
          :aria-label="`Quitar hashtag ${tag}`"
          @click="remove(tag)"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" class="size-3.5" aria-hidden="true">
            <path
              d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
            />
          </svg>
        </button>
      </li>
    </ul>

    <div class="relative">
      <input
        :id="inputId"
        v-model="query"
        type="text"
        role="combobox"
        autocomplete="off"
        aria-autocomplete="list"
        :aria-expanded="open"
        :aria-controls="listId"
        :aria-activedescendant="
          activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
        "
        :aria-invalid="shownError !== undefined || undefined"
        :aria-describedby="describedBy"
        :disabled="disabled || isFull"
        :placeholder="isFull ? `Máximo ${max} hashtags` : 'Escribí y presioná Enter o coma'"
        class="w-full rounded-lg border bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 disabled:cursor-not-allowed disabled:bg-stone-100 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500 dark:disabled:bg-stone-900"
        :class="
          shownError !== undefined
            ? 'border-red-500 dark:border-red-500'
            : 'border-stone-300 hover:border-stone-400 dark:border-stone-600 dark:hover:border-stone-500'
        "
        @keydown="onKeydown"
        @blur="open = false"
      />

      <ul
        v-show="open && suggestions.length > 0"
        :id="listId"
        role="listbox"
        aria-label="Sugerencias de hashtags"
        class="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-800"
      >
        <li
          v-for="(suggestion, index) in suggestions"
          :id="`${listId}-option-${index}`"
          :key="suggestion"
          role="option"
          :aria-selected="index === activeIndex"
          class="cursor-pointer px-3 py-1.5 text-sm"
          :class="
            index === activeIndex
              ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100'
              : 'text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-700'
          "
          @mousedown.prevent="add(suggestion)"
        >
          #{{ suggestion }}
        </li>
      </ul>
    </div>

    <p :id="hintId" class="text-xs text-stone-500 dark:text-stone-400">
      {{ model.length }}/{{ max }} hashtags · se guardan en minúscula y sin «#».
    </p>
    <p v-if="shownError" :id="errorId" role="alert" class="text-sm text-red-700 dark:text-red-400">
      {{ shownError }}
    </p>
  </div>
</template>
