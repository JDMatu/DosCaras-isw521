<script setup lang="ts">
/**
 * Screen 4 — publication detail (`/views/:id`), public in read-only mode.
 *
 * The API has no title of its own for a `PoliticalView`: the two `ViewSide`
 * rows carry the titles, so the SIDE ("Postura") title is used as the page
 * heading. Sides arrive in no guaranteed order, hence the filtering by `type`.
 */
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import FavoriteButton from '@/components/views/FavoriteButton.vue'
import ShareButton from '@/components/views/ShareButton.vue'
import SidePanel from '@/components/detail/SidePanel.vue'
import ThreadsSection from '@/components/detail/ThreadsSection.vue'
import { ApiError, errorMessage } from '@/lib/http'
import { formatDate } from '@/lib/format'
import * as viewsService from '@/services/views'
import { useAuthStore } from '@/stores/auth'
import { useConnectionStore } from '@/stores/connection'
import { useHistoryStore } from '@/stores/history'
import { useToastsStore } from '@/stores/toasts'
import type { PoliticalView, ReactionResponse, SideType } from '@/types/api'

const route = useRoute()
const auth = useAuthStore()
const connection = useConnectionStore()
const history = useHistoryStore()
const toasts = useToastsStore()

const view = ref<PoliticalView | null>(null)
const loading = ref(true)
const notFound = ref(false)
const loadError = ref('')

const viewId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const side = computed(() => view.value?.sides.find((s) => s.type === 'SIDE') ?? null)
const counterpart = computed(
  () => view.value?.sides.find((s) => s.type === 'COUNTERPART') ?? null,
)
const heading = computed(() => side.value?.title ?? 'Publicación')

const canEdit = computed(() => {
  if (view.value === null) return false
  return auth.user?.id === view.value.authorId || auth.isSuperadmin
})

async function load(): Promise<void> {
  if (viewId.value === '') {
    notFound.value = true
    loading.value = false
    return
  }
  loading.value = true
  notFound.value = false
  loadError.value = ''
  try {
    const { view: fetched } = await viewsService.getView(viewId.value)
    view.value = fetched
    // Spec §3.5: every visited publication goes into the local FIFO history.
    history.record({
      id: fetched.id,
      titulo: fetched.sides.find((s) => s.type === 'SIDE')?.title ?? 'Publicación',
      categoria: fetched.category.name,
    })
  } catch (err) {
    view.value = null
    if (err instanceof ApiError && err.status === 404) notFound.value = true
    else loadError.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}

/** Applies the counters returned by the reaction endpoint to one side. */
function applyReaction(type: SideType, response: ReactionResponse): void {
  const target = view.value?.sides.find((s) => s.type === type)
  if (target === undefined) return
  target.likeCount = response.likeCount
  target.dislikeCount = response.dislikeCount
  target.myReaction = response.myReaction
}

/** Superadmin publish / unpublish. */
const pendingStatusAction = ref<'publish' | 'unpublish' | null>(null)
const statusSubmitting = ref(false)

async function confirmStatusChange(): Promise<void> {
  const action = pendingStatusAction.value
  const current = view.value
  if (action === null || current === null) return
  statusSubmitting.value = true
  try {
    if (action === 'unpublish') await viewsService.unpublishView(current.id)
    else await viewsService.publishView(current.id)
    pendingStatusAction.value = null
    toasts.success(action === 'unpublish' ? 'Publicación despublicada.' : 'Publicación republicada.')
    // The PATCH responses return the bare Prisma record (no sides, category,
    // author, counts), so the full detail has to be refetched.
    await load()
  } catch (err) {
    toasts.error(errorMessage(err))
  } finally {
    statusSubmitting.value = false
  }
}

watch(viewId, () => void load(), { immediate: true })

// Spec §3.5: reload fresh data as soon as connectivity comes back.
watch(
  () => connection.becameOnline,
  () => {
    if (loadError.value !== '') void load()
  },
)
</script>

<template>
  <div v-if="loading" class="flex flex-col items-center gap-3 py-16">
    <LoadingSpinner class="size-8 text-amber-700 dark:text-amber-500" />
    <p role="status" class="text-sm text-stone-500 dark:text-stone-400">Cargando publicación…</p>
  </div>

  <section
    v-else-if="notFound"
    class="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border border-stone-200 bg-white px-6 py-12 text-center dark:border-stone-700 dark:bg-stone-900"
  >
    <h1 class="text-xl font-bold text-stone-900 dark:text-stone-50">Publicación no encontrada</h1>
    <p class="text-sm text-stone-600 dark:text-stone-300">
      Esta publicación no existe o fue eliminada.
    </p>
    <RouterLink
      :to="{ name: 'board' }"
      class="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
    >
      Volver al tablero
    </RouterLink>
  </section>

  <ErrorState v-else-if="loadError" :message="loadError" retryable @retry="load()" />

  <article v-else-if="view !== null" class="flex flex-col gap-8">
    <header class="flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <RouterLink
              :to="{ name: 'category', params: { id: view.category.id } }"
              class="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200 dark:hover:bg-amber-900"
            >
              {{ view.category.name }}
            </RouterLink>
            <span
              v-if="view.status === 'UNPUBLISHED'"
              class="rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-700 dark:bg-stone-700 dark:text-stone-200"
            >
              Despublicada
            </span>
          </div>
          <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-50 sm:text-3xl">
            {{ heading }}
          </h1>
          <p v-if="counterpart" class="text-base font-medium text-stone-500 dark:text-stone-400">
            vs. {{ counterpart.title }}
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-1">
          <ShareButton :view-id="view.id" :title="heading" />
          <FavoriteButton :view-id="view.id" />
        </div>
      </div>

      <ul v-if="view.hashtags.length > 0" class="flex flex-wrap gap-1.5" aria-label="Hashtags">
        <li
          v-for="tag in view.hashtags"
          :key="tag.id"
          class="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300"
        >
          #{{ tag.name }}
        </li>
      </ul>

      <div
        class="flex flex-wrap items-center justify-between gap-3 border-y border-stone-200 py-3 text-sm text-stone-600 dark:border-stone-800 dark:text-stone-300"
      >
        <p>
          Por
          <RouterLink
            :to="{ name: 'author', params: { id: view.author.id } }"
            class="font-medium text-amber-800 hover:underline dark:text-amber-400"
          >
            {{ view.author.name }}
          </RouterLink>
          · <time :datetime="view.createdAt">{{ formatDate(view.createdAt) }}</time>
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <RouterLink
            v-if="canEdit"
            :to="{ name: 'view-edit', params: { id: view.id } }"
            class="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
          >
            Editar
          </RouterLink>
          <BaseButton
            v-if="auth.isSuperadmin && view.status === 'PUBLISHED'"
            variant="danger"
            @click="pendingStatusAction = 'unpublish'"
          >
            Despublicar
          </BaseButton>
          <BaseButton
            v-else-if="auth.isSuperadmin"
            variant="secondary"
            @click="pendingStatusAction = 'publish'"
          >
            Republicar
          </BaseButton>
        </div>
      </div>
    </header>

    <div class="grid gap-6 lg:grid-cols-2">
      <SidePanel
        v-if="side"
        :view-id="view.id"
        :side="side"
        side-key="a"
        heading="Postura"
        @reaction="applyReaction('SIDE', $event)"
      />
      <SidePanel
        v-if="counterpart"
        :view-id="view.id"
        :side="counterpart"
        side-key="b"
        heading="Contrapostura"
        @reaction="applyReaction('COUNTERPART', $event)"
      />
    </div>

    <ThreadsSection :view-id="view.id" />
  </article>

  <ConfirmDialog
    :open="pendingStatusAction !== null"
    :title="pendingStatusAction === 'publish' ? 'Republicar publicación' : 'Despublicar publicación'"
    :message="
      pendingStatusAction === 'publish'
        ? '¿Querés volver a publicar este contenido? Será visible para todo el mundo otra vez.'
        : '¿Querés despublicar este contenido? Dejará de aparecer en el tablero y solo será visible para su autor y los superadministradores.'
    "
    :confirm-label="pendingStatusAction === 'publish' ? 'Republicar' : 'Despublicar'"
    :danger="pendingStatusAction === 'unpublish'"
    :loading="statusSubmitting"
    @confirm="confirmStatusChange"
    @cancel="pendingStatusAction = null"
  />
</template>
