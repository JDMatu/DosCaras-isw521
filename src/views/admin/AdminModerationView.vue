<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import PaginationControls from '@/components/ui/PaginationControls.vue'
import StatusBadge from '@/components/admin/StatusBadge.vue'
import { ApiError, errorMessage } from '@/lib/http'
import { formatDate } from '@/lib/format'
import * as adminService from '@/services/admin'
import * as viewsService from '@/services/views'
import { useToastsStore } from '@/stores/toasts'
import type { PoliticalView, ViewStatus } from '@/types/api'

const LIMIT = 10

const toasts = useToastsStore()

const views = ref<PoliticalView[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const error = ref('')
const forbidden = ref(false)

const statusFilter = ref('')

const STATUS_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'PUBLISHED', label: 'Publicadas' },
  { value: 'UNPUBLISHED', label: 'Despublicadas' },
]

const pendingView = ref<PoliticalView | null>(null)
const actionPending = ref(false)

const confirmMessage = computed(() => {
  if (!pendingView.value) return ''
  return pendingView.value.status === 'PUBLISHED'
    ? `“${sideTitle(pendingView.value)}” dejará de aparecer en el tablero y en las búsquedas. Solo su autor y los superadministradores podrán verla.`
    : `“${sideTitle(pendingView.value)}” volverá a estar visible en el tablero para todo el público.`
})

/** The API guarantees two sides but not their order: always filter by type. */
function sideTitle(view: PoliticalView): string {
  return view.sides.find((side) => side.type === 'SIDE')?.title ?? 'Publicación sin título'
}

function counterpartTitle(view: PoliticalView): string | null {
  return view.sides.find((side) => side.type === 'COUNTERPART')?.title ?? null
}

function selectedStatus(): ViewStatus | undefined {
  if (statusFilter.value === 'PUBLISHED' || statusFilter.value === 'UNPUBLISHED') {
    return statusFilter.value
  }
  return undefined
}

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  forbidden.value = false
  try {
    const response = await adminService.listAllViews({
      status: selectedStatus(),
      page: page.value,
      limit: LIMIT,
    })
    views.value = response.views
    total.value = response.total
  } catch (err) {
    views.value = []
    total.value = 0
    if (err instanceof ApiError && err.status === 403) {
      forbidden.value = true
      error.value =
        'No tenés permisos para moderar publicaciones. Esta sección requiere el rol de superadministrador.'
    } else {
      error.value = errorMessage(err)
    }
  } finally {
    loading.value = false
  }
}

watch(statusFilter, () => {
  page.value = 1
  void load()
})

function goToPage(next: number): void {
  page.value = next
  void load()
}

async function confirmAction(): Promise<void> {
  const target = pendingView.value
  if (!target) return
  actionPending.value = true
  try {
    const { view: updated } =
      target.status === 'PUBLISHED'
        ? await viewsService.unpublishView(target.id)
        : await viewsService.publishView(target.id)
    // Reduced payload: patch only the status of the existing row.
    const row = views.value.find((item) => item.id === updated.id)
    if (row) row.status = updated.status
    toasts.success(
      updated.status === 'UNPUBLISHED'
        ? 'La publicación fue despublicada.'
        : 'La publicación volvió a publicarse.',
    )
    pendingView.value = null
  } catch (err) {
    toasts.error(errorMessage(err))
  } finally {
    actionPending.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="flex flex-col gap-6">
    <header>
      <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-50">Moderación de contenido</h1>
      <p class="mt-1 text-sm text-stone-600 dark:text-stone-300">
        Revisá todas las publicaciones de la plataforma y despublicá las que infrinjan las normas.
      </p>
    </header>

    <div class="max-w-xs">
      <BaseSelect v-model="statusFilter" label="Filtrar por estado" :options="STATUS_OPTIONS" />
    </div>

    <div v-if="loading" class="flex items-center justify-center gap-3 py-16" role="status">
      <LoadingSpinner class="size-6 text-amber-700 dark:text-amber-400" />
      <span class="text-sm text-stone-600 dark:text-stone-300">Cargando publicaciones…</span>
    </div>

    <ErrorState v-else-if="error" :message="error" :retryable="!forbidden" @retry="load" />

    <EmptyState
      v-else-if="views.length === 0"
      title="No hay publicaciones para este filtro"
      description="Probá con otro estado o volvé a “Todas” para ver el contenido completo de la plataforma."
    />

    <template v-else>
      <div class="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
        <table class="w-full min-w-[52rem] border-collapse text-left text-sm">
          <caption class="sr-only">
            Publicaciones de la plataforma con su autor, categoría, estado y reacciones
          </caption>
          <thead class="bg-stone-100 text-xs uppercase tracking-wide text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            <tr>
              <th scope="col" class="px-4 py-3 font-semibold">Título</th>
              <th scope="col" class="px-4 py-3 font-semibold">Autor</th>
              <th scope="col" class="px-4 py-3 font-semibold">Categoría</th>
              <th scope="col" class="px-4 py-3 font-semibold">Fecha</th>
              <th scope="col" class="px-4 py-3 font-semibold">Estado</th>
              <th scope="col" class="px-4 py-3 font-semibold">Reacciones</th>
              <th scope="col" class="px-4 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-200 dark:divide-stone-700">
            <tr v-for="view in views" :key="view.id" class="bg-white dark:bg-stone-900">
              <th scope="row" class="max-w-xs px-4 py-3 font-medium text-stone-900 dark:text-stone-100">
                {{ sideTitle(view) }}
                <span
                  v-if="counterpartTitle(view)"
                  class="block text-xs font-normal text-stone-500 dark:text-stone-400"
                >
                  vs. {{ counterpartTitle(view) }}
                </span>
              </th>
              <td class="px-4 py-3 text-stone-600 dark:text-stone-300">{{ view.author.name }}</td>
              <td class="px-4 py-3 text-stone-600 dark:text-stone-300">{{ view.category.name }}</td>
              <td class="px-4 py-3 text-stone-600 dark:text-stone-300">
                <time :datetime="view.createdAt">{{ formatDate(view.createdAt) }}</time>
              </td>
              <td class="px-4 py-3">
                <StatusBadge :tone="view.status === 'PUBLISHED' ? 'green' : 'gray'">
                  {{ view.status === 'PUBLISHED' ? 'Publicada' : 'Despublicada' }}
                </StatusBadge>
              </td>
              <td class="px-4 py-3 text-stone-600 dark:text-stone-300">
                <span :aria-label="`${view.totalLikes} me gusta en total`">
                  <span aria-hidden="true">👍</span> {{ view.totalLikes }}
                </span>
                <span class="ml-3" :aria-label="`${view.totalDislikes} no me gusta en total`">
                  <span aria-hidden="true">👎</span> {{ view.totalDislikes }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <RouterLink
                    :to="{ name: 'view-detail', params: { id: view.id } }"
                    class="inline-flex items-center rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
                  >
                    Ver detalle
                  </RouterLink>
                  <BaseButton
                    :variant="view.status === 'PUBLISHED' ? 'danger' : 'secondary'"
                    :disabled="actionPending"
                    @click="pendingView = view"
                  >
                    {{ view.status === 'PUBLISHED' ? 'Despublicar' : 'Republicar' }}
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PaginationControls
        :page="page"
        :limit="LIMIT"
        :total="total"
        :disabled="loading"
        @change="goToPage"
      />
    </template>

    <ConfirmDialog
      :open="pendingView !== null"
      :title="pendingView?.status === 'PUBLISHED' ? 'Despublicar publicación' : 'Republicar publicación'"
      :message="confirmMessage"
      :confirm-label="pendingView?.status === 'PUBLISHED' ? 'Despublicar' : 'Republicar'"
      :danger="pendingView?.status === 'PUBLISHED'"
      :loading="actionPending"
      @confirm="confirmAction"
      @cancel="pendingView = null"
    />
  </section>
</template>
