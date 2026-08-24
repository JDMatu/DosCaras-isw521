<script setup lang="ts">

import { ref } from 'vue'

export interface ProfileTab {
  id: string
  label: string
}

const props = defineProps<{ tabs: ProfileTab[] }>()
const selected = defineModel<string>({ required: true })

const listRef = ref<HTMLElement | null>(null)

function focusTab(index: number): void {
  const buttons = listRef.value?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
  buttons?.[index]?.focus()
}

function onKeydown(event: KeyboardEvent, index: number): void {
  const count = props.tabs.length
  if (count === 0) return
  let next: number
  switch (event.key) {
    case 'ArrowRight':
      next = (index + 1) % count
      break
    case 'ArrowLeft':
      next = (index - 1 + count) % count
      break
    case 'Home':
      next = 0
      break
    case 'End':
      next = count - 1
      break
    default:
      return
  }
  event.preventDefault()
  const target = props.tabs[next]
  if (!target) return
  selected.value = target.id
  focusTab(next)
}
</script>

<template>
  <div
    ref="listRef"
    role="tablist"
    aria-label="Secciones del perfil"
    class="flex flex-wrap gap-1 border-b border-stone-200 dark:border-stone-700"
  >
    <button
      v-for="(tab, index) in tabs"
      :id="`profile-tab-${tab.id}`"
      :key="tab.id"
      type="button"
      role="tab"
      :aria-selected="selected === tab.id"
      :aria-controls="`profile-panel-${tab.id}`"
      :tabindex="selected === tab.id ? 0 : -1"
      class="-mb-px rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
      :class="
        selected === tab.id
          ? 'border-amber-700 text-amber-800 dark:border-amber-500 dark:text-amber-400'
          : 'border-transparent text-stone-600 hover:border-stone-300 hover:text-stone-900 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-100'
      "
      @click="selected = tab.id"
      @keydown="onKeydown($event, index)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
