<script setup lang="ts">
import { shareUrl } from '@/lib/share'
import { useToastsStore } from '@/stores/toasts'

const props = defineProps<{ viewId: string; title: string }>()

const toasts = useToastsStore()

async function share(): Promise<void> {
  const url = `${window.location.origin}/views/${props.viewId}`
  const result = await shareUrl(props.title, url)
  if (result === 'copied') toasts.success('Enlace copiado al portapapeles.')
  else if (result === 'failed') toasts.error('No se pudo compartir el enlace.')
}
</script>

<template>
  <button type="button" aria-label="Compartir publicación"
    class="rounded-md p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-300"
    @click.prevent.stop="share"
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="size-5" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185z" />
    </svg>
  </button>
</template>
