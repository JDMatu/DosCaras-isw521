<script setup lang="ts">
/**
 * Comment threads of a view: expandable list, a form to open a new thread and
 * a form to comment (or reply, one level deep) inside each thread.
 *
 * Moderation divergence: the course spec asks for an "AI moderation" warning
 * and a "pending moderation" indicator per comment. The real API exposes NO
 * moderation field on `Comment` (see the Prisma schema: id, threadId, userId,
 * parentId, content, createdAt) and no moderation endpoint, so we show a
 * static advisory notice and deliberately do NOT invent a per-comment
 * "pendiente" state that the backend could never confirm.
 */
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import CommentItem from './CommentItem.vue'
import { errorMessage } from '@/lib/http'
import { formatDateTime } from '@/lib/format'
import * as threadsService from '@/services/threads'
import { useAuthStore } from '@/stores/auth'
import { useToastsStore } from '@/stores/toasts'
import type { CommentThread } from '@/types/api'

const props = defineProps<{ viewId: string }>()

const route = useRoute()
const auth = useAuthStore()
const toasts = useToastsStore()

const threads = ref<CommentThread[]>([])
const loading = ref(true)
const loadError = ref('')
const expanded = ref<Record<string, boolean>>({})

/** New-thread form. */
const newTitle = ref('')
const newContent = ref('')
const newContentError = ref('')
const creatingThread = ref(false)

/** Per-thread comment forms, keyed by thread id. */
const commentDrafts = ref<Record<string, string>>({})
const commentErrors = ref<Record<string, string>>({})
const commentPending = ref<string | null>(null)

async function load(expandId?: string): Promise<void> {
  loading.value = true
  loadError.value = ''
  try {
    const { threads: fetched } = await threadsService.listThreads(props.viewId)
    threads.value = fetched
    // Seed one draft slot per thread so the textarea always has a bound string.
    for (const thread of fetched) {
      if (commentDrafts.value[thread.id] === undefined) commentDrafts.value[thread.id] = ''
    }
    const first = fetched[0]
    if (expandId !== undefined) expanded.value[expandId] = true
    else if (first !== undefined && Object.keys(expanded.value).length === 0) {
      expanded.value[first.id] = true
    }
  } catch (err) {
    threads.value = []
    loadError.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

function toggle(threadId: string): void {
  expanded.value[threadId] = !expanded.value[threadId]
}

async function createThread(): Promise<void> {
  const content = newContent.value.trim()
  if (content === '') {
    newContentError.value = 'Escribí el primer comentario del hilo.'
    return
  }
  newContentError.value = ''
  creatingThread.value = true
  try {
    const title = newTitle.value.trim()
    const { thread } = await threadsService.createThread(props.viewId, {
      ...(title === '' ? {} : { title }),
      content,
    })
    newTitle.value = ''
    newContent.value = ''
    toasts.success('Hilo publicado.')
    await load(thread.id)
  } catch (err) {
    toasts.error(errorMessage(err))
  } finally {
    creatingThread.value = false
  }
}

async function addComment(threadId: string): Promise<void> {
  const content = (commentDrafts.value[threadId] ?? '').trim()
  if (content === '') {
    commentErrors.value[threadId] = 'Escribí un comentario antes de enviarlo.'
    return
  }
  commentErrors.value[threadId] = ''
  commentPending.value = threadId
  try {
    await threadsService.createComment(props.viewId, threadId, { content })
    commentDrafts.value[threadId] = ''
    toasts.success('Comentario publicado.')
    // Refetch instead of splicing locally: the POST response shape for a
    // comment is not guaranteed to carry the same `replies`/`user` tree.
    await load(threadId)
  } catch (err) {
    toasts.error(errorMessage(err))
  } finally {
    commentPending.value = null
  }
}

/** Passed down to CommentItem; resolves to true when the reply was stored. */
async function submitReply(threadId: string, parentId: string, content: string): Promise<boolean> {
  try {
    await threadsService.createComment(props.viewId, threadId, { content, parentId })
    toasts.success('Respuesta publicada.')
    await load(threadId)
    return true
  } catch (err) {
    toasts.error(errorMessage(err))
    return false
  }
}

function replyHandler(threadId: string): (parentId: string, content: string) => Promise<boolean> {
  return (parentId, content) => submitReply(threadId, parentId, content)
}

onMounted(() => {
  void load()
})

watch(
  () => props.viewId,
  () => {
    expanded.value = {}
    void load()
  },
)
</script>

<template>
  <section aria-labelledby="threads-heading" class="flex flex-col gap-4">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="threads-heading" class="text-xl font-bold text-stone-900 dark:text-stone-50">
        Hilos de comentarios
      </h2>
      <p v-if="!loading && threads.length > 0" class="text-sm text-stone-500 dark:text-stone-400">
        {{ threads.length }} {{ threads.length === 1 ? 'hilo' : 'hilos' }}
      </p>
    </div>

    <p
      role="note"
      class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
    >
      Los comentarios pueden ser moderados. Mantené un tono respetuoso y aportá argumentos, no
      ataques personales.
    </p>

    <div v-if="loading" class="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
      <LoadingSpinner class="size-5" />
      <span role="status">Cargando comentarios…</span>
    </div>

    <ErrorState v-else-if="loadError" :message="loadError" retryable @retry="load()" />

    <EmptyState
      v-else-if="threads.length === 0"
      title="Todavía no hay comentarios"
      description="Sé la primera persona en abrir un hilo de discusión sobre esta publicación."
    />

    <ul v-else class="flex flex-col gap-3">
      <li
        v-for="thread in threads"
        :key="thread.id"
        class="rounded-xl border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50"
      >
        <h3>
          <button
            type="button"
            class="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 dark:hover:bg-stone-800"
            :aria-expanded="expanded[thread.id] === true"
            :aria-controls="`thread-panel-${thread.id}`"
            @click="toggle(thread.id)"
          >
            <span class="min-w-0">
              <span class="block truncate font-semibold text-stone-800 dark:text-stone-100">
                {{ thread.title ?? 'Hilo sin título' }}
              </span>
              <span class="block text-xs text-stone-500 dark:text-stone-400">
                {{ thread.comments.length }}
                {{ thread.comments.length === 1 ? 'comentario' : 'comentarios' }} ·
                <time :datetime="thread.createdAt">{{ formatDateTime(thread.createdAt) }}</time>
              </span>
            </span>
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              class="size-5 shrink-0 text-stone-500 transition-transform dark:text-stone-400"
              :class="expanded[thread.id] === true ? 'rotate-180' : ''"
              aria-hidden="true"
            >
              <path
                fill-rule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </h3>

        <div
          v-show="expanded[thread.id] === true"
          :id="`thread-panel-${thread.id}`"
          class="border-t border-stone-200 px-4 py-3 dark:border-stone-700"
        >
          <ul class="flex flex-col gap-2">
            <CommentItem
              v-for="comment in thread.comments"
              :key="comment.id"
              :comment="comment"
              :can-reply="auth.isAuthenticated"
              :submit-reply="replyHandler(thread.id)"
            />
          </ul>

          <form
            v-if="auth.isAuthenticated"
            class="mt-4 flex flex-col gap-2"
            novalidate
            @submit.prevent="addComment(thread.id)"
          >
            <BaseTextarea
              v-model="commentDrafts[thread.id]"
              label="Agregar un comentario a este hilo"
              :rows="3"
              :error="commentErrors[thread.id]"
              :disabled="commentPending === thread.id"
              placeholder="Aportá tu punto de vista…"
            />
            <div class="flex justify-end">
              <BaseButton
                type="submit"
                :loading="commentPending === thread.id"
                :disabled="commentPending === thread.id"
              >
                Comentar
              </BaseButton>
            </div>
          </form>
        </div>
      </li>
    </ul>

    <div
      v-if="auth.isAuthenticated"
      class="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-900"
    >
      <h3 class="mb-3 text-base font-semibold text-stone-900 dark:text-stone-50">
        Abrir un hilo nuevo
      </h3>
      <form class="flex flex-col gap-3" novalidate @submit.prevent="createThread">
        <BaseInput
          v-model="newTitle"
          label="Título del hilo (opcional)"
          placeholder="Ej. ¿Qué dicen los datos?"
          :disabled="creatingThread"
        />
        <BaseTextarea
          v-model="newContent"
          label="Primer comentario"
          required
          :rows="4"
          :error="newContentError"
          :disabled="creatingThread"
          placeholder="Planteá el tema del hilo…"
        />
        <div class="flex justify-end">
          <BaseButton type="submit" :loading="creatingThread" :disabled="creatingThread">
            Publicar hilo
          </BaseButton>
        </div>
      </form>
    </div>

    <p
      v-else
      class="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
    >
      <RouterLink
        :to="{ name: 'login', query: { redirect: route.fullPath } }"
        class="font-medium text-amber-800 hover:underline dark:text-amber-400"
      >
        Iniciá sesión
      </RouterLink>
      para comentar o abrir un hilo nuevo.
    </p>
  </section>
</template>
