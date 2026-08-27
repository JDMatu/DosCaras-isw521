<script setup lang="ts">

import { computed } from 'vue'

const props = defineProps<{ text: string; term: string }>()

interface Segment {
  key: number
  text: string
  match: boolean
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const segments = computed<Segment[]>(() => {
  const term = props.term.trim()
  if (term === '' || props.text === '') {
    return [{ key: 0, text: props.text, match: false }]
  }
  // One alternation over the distinct words so a multi-word query highlights
  // each of them. Word boundaries (\b) are avoided: they behave poorly with
  // accented Spanish letters.
  const words = Array.from(new Set(term.split(/\s+/).filter((word) => word !== ''))).map(
    escapeRegExp,
  )
  const pattern = new RegExp(`(${words.join('|')})`, 'gi')
  // String.split with a single capturing group alternates
  // [no-match, match, no-match, ...], so odd indexes are the matches.
  const segmentList: Segment[] = []
  props.text.split(pattern).forEach((part, index) => {
    if (part === '') return
    segmentList.push({ key: index, text: part, match: index % 2 === 1 })
  })
  return segmentList
})
</script>

<template>
  <span
    ><template v-for="segment in segments" :key="segment.key"
      ><mark
        v-if="segment.match"
        class="rounded-sm bg-amber-200 px-0.5 text-stone-900 dark:bg-amber-500/40 dark:text-amber-50"
        >{{ segment.text }}</mark
      ><template v-else>{{ segment.text }}</template></template
    ></span
  >
</template>
