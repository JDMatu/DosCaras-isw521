<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import { formatDateTime } from '@/lib/format'
import type { Comment } from '@/types/api'

const props = defineProps<{
  comment: Comment
  canReply: boolean
  submitReply?: (parentId: string, content: string) => Promise<boolean>
}>()

const open = ref(false)
const content = ref('')
const error = ref('')
const sending = ref(false)

function toggle(): void {
  open.value = !open.value
  if (!open.value) {
    content.value = ''
    error.value = ''
  }
}

async function send(): Promise<void> {
  const text = content.value.trim()
  if (text === '') {
    error.value = 'Escribí una respuesta antes de enviarla.'
    return
  }
  if (props.submitReply === undefined) return
  error.value = ''
  sending.value = true
  try {
    const ok = await props.submitReply(props.comment.id, text)
    if (ok) {
      content.value = ''
      open.value = false
    }
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <li class="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900">
    <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <p class="text-sm font-semibold text-stone-800 dark:text-stone-100">
        {{ comment.user.name }}
      </p>
      <time
        :datetime="comment.createdAt"
        class="text-xs text-stone-500 dark:text-stone-400"
      >
        {{ formatDateTime(comment.createdAt) }}
      </time>
    </div>
    <p class="mt-1 whitespace-pre-line text-sm text-stone-700 dark:text-stone-200">
      {{ comment.content }}
    </p>

    <div v-if="canReply" class="mt-2">
      <button
        type="button"
        class="rounded-md px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:text-amber-400 dark:hover:bg-amber-950/50"
        :aria-expanded="open"
        @click="toggle"
      >
        {{ open ? 'Cancelar respuesta' : 'Responder' }}
      </button>

      <form v-if="open" class="mt-2 flex flex-col gap-2" novalidate @submit.prevent="send">
        <BaseTextarea
          v-model="content"
          :label="`Responder a ${comment.user.name}`"
          :rows="3"
          :error="error"
          :disabled="sending"
          placeholder="Escribí tu respuesta…"
        />
        <div class="flex justify-end">
          <BaseButton type="submit" :loading="sending" :disabled="sending">
            Enviar respuesta
          </BaseButton>
        </div>
      </form>
    </div>

    <ul
      v-if="comment.replies && comment.replies.length > 0"
      class="mt-3 flex flex-col gap-2 border-l-2 border-stone-200 pl-3 dark:border-stone-700"
      :aria-label="`Respuestas a ${comment.user.name}`"
    >
      <CommentItem
        v-for="reply in comment.replies"
        :key="reply.id"
        :comment="reply"
        :can-reply="false"
      />
    </ul>
  </li>
</template>
