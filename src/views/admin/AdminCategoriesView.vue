<script setup lang="ts">
/**
 * Pantalla 8 — Panel superadmin: gestión de categorías (`/admin/categories`).
 */
import { computed, onMounted, ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import CategoryFormModal from '@/components/admin/CategoryFormModal.vue'
import StatusBadge from '@/components/admin/StatusBadge.vue'
import { ApiError, errorMessage } from '@/lib/http'
import { formatDate } from '@/lib/format'
import * as adminService from '@/services/admin'
import { useToastsStore } from '@/stores/toasts'
import type { Category } from '@/types/api'

const toasts = useToastsStore()

const categories = ref<Category[]>([])
const loading = ref(false)
const error = ref('')
const forbidden = ref(false)

const formOpen = ref(false)
const editing = ref<Category | null>(null)
const submitting = ref(false)
const formServerError = ref('')

const pendingDelete = ref<Category | null>(null)
const deleting = ref(false)

/** Names already taken — includes soft-deleted ones because `name` stays
 * unique in the database, so reusing one would still fail with 409. */
const existingNames = computed(() =>
  categories.value
    .filter((category) => category.id !== editing.value?.id)
    .map((category) => category.name),
)

const activeCount = computed(
  () => categories.value.filter((category) => category.deletedAt === null).length,
)

function sortByName(list: Category[]): Category[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

async function load(options: { silent?: boolean } = {}): Promise<void> {
  if (!options.silent) loading.value = true
  error.value = ''
  forbidden.value = false
  try {
    const { categories: list } = await adminService.listAllCategories()
    categories.value = sortByName(list)
  } catch (err) {
    if (err instanceof ApiError && err.status === 403) {
      forbidden.value = true
      error.value =
        'No tenés permisos para administrar categorías. Esta sección requiere el rol de superadministrador.'
    } else {
      error.value = errorMessage(err)
    }
    categories.value = []
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  editing.value = null
  formServerError.value = ''
  formOpen.value = true
}

function openEdit(category: Category): void {
  editing.value = category
  formServerError.value = ''
  formOpen.value = true
}

function closeForm(): void {
  formOpen.value = false
  editing.value = null
  formServerError.value = ''
}

async function submitForm(name: string): Promise<void> {
  submitting.value = true
  formServerError.value = ''
  const target = editing.value
  try {
    if (target) {
      const { category } = await adminService.updateCategory(target.id, name)
      categories.value = sortByName(
        categories.value.map((row) => (row.id === category.id ? category : row)),
      )
      toasts.success('Categoría actualizada.')
    } else {
      const { category } = await adminService.createCategory(name)
      categories.value = sortByName([...categories.value, category])
      toasts.success('Categoría creada.')
    }
    closeForm()
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      formServerError.value = 'Ya existe una categoría con ese nombre.'
    } else {
      formServerError.value = errorMessage(err)
    }
  } finally {
    submitting.value = false
  }
}

async function confirmDelete(): Promise<void> {
  const target = pendingDelete.value
  if (!target) return
  deleting.value = true
  try {
    await adminService.deleteCategory(target.id)
    toasts.success(`Se eliminó la categoría “${target.name}”.`)
    pendingDelete.value = null
    // 204 has no body: refetch quietly to pick up the server-side deletedAt
    // without blanking the table.
    await load({ silent: true })
  } catch (err) {
    toasts.error(errorMessage(err))
  } finally {
    deleting.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="flex flex-col gap-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-50">Gestión de categorías</h1>
        <p class="mt-1 text-sm text-stone-600 dark:text-stone-300">
          Creá, renombrá o eliminá las categorías con las que se clasifican las publicaciones.
        </p>
      </div>
      <BaseButton :disabled="loading || Boolean(error)" @click="openCreate">
        Nueva categoría
      </BaseButton>
    </header>

    <div v-if="loading" class="flex items-center justify-center gap-3 py-16" role="status">
      <LoadingSpinner class="size-6 text-amber-700 dark:text-amber-400" />
      <span class="text-sm text-stone-600 dark:text-stone-300">Cargando categorías…</span>
    </div>

    <ErrorState v-else-if="error" :message="error" :retryable="!forbidden" @retry="load" />

    <EmptyState
      v-else-if="categories.length === 0"
      title="Todavía no hay categorías"
      description="Creá la primera categoría para que los autores puedan clasificar sus publicaciones."
    >
      <BaseButton @click="openCreate">Nueva categoría</BaseButton>
    </EmptyState>

    <template v-else>
      <p class="text-sm text-stone-500 dark:text-stone-400">
        {{ activeCount }} {{ activeCount === 1 ? 'categoría activa' : 'categorías activas' }} de
        {{ categories.length }} en total (se incluyen las eliminadas).
      </p>

      <div class="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
        <table class="w-full min-w-[36rem] border-collapse text-left text-sm">
          <caption class="sr-only">
            Categorías registradas, incluidas las eliminadas
          </caption>
          <thead class="bg-stone-100 text-xs uppercase tracking-wide text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            <tr>
              <th scope="col" class="px-4 py-3 font-semibold">Nombre</th>
              <th scope="col" class="px-4 py-3 font-semibold">Estado</th>
              <th scope="col" class="px-4 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-200 dark:divide-stone-700">
            <tr v-for="category in categories" :key="category.id" class="bg-white dark:bg-stone-900">
              <th scope="row" class="px-4 py-3 font-medium text-stone-900 dark:text-stone-100">
                {{ category.name }}
              </th>
              <td class="px-4 py-3">
                <StatusBadge :tone="category.deletedAt === null ? 'green' : 'gray'">
                  {{
                    category.deletedAt === null
                      ? 'Activa'
                      : `Eliminada el ${formatDate(category.deletedAt)}`
                  }}
                </StatusBadge>
              </td>
              <td class="px-4 py-3">
                <div v-if="category.deletedAt === null" class="flex justify-end gap-2">
                  <BaseButton variant="secondary" @click="openEdit(category)">
                    Editar
                  </BaseButton>
                  <BaseButton variant="danger" @click="pendingDelete = category">
                    Eliminar
                  </BaseButton>
                </div>
                <p v-else class="text-right text-xs text-stone-500 dark:text-stone-400">
                  El API no permite restaurar una categoría eliminada.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <CategoryFormModal
      :open="formOpen"
      :title="editing ? 'Editar categoría' : 'Nueva categoría'"
      :submit-label="editing ? 'Guardar cambios' : 'Crear categoría'"
      :initial-name="editing?.name ?? ''"
      :existing-names="existingNames"
      :submitting="submitting"
      :server-error="formServerError"
      @submit="submitForm"
      @cancel="closeForm"
    />

    <ConfirmDialog
      :open="pendingDelete !== null"
      title="Eliminar categoría"
      :message="`Se va a eliminar la categoría “${pendingDelete?.name ?? ''}”. Las publicaciones asociadas dejarán de mostrar una categoría válida y el API no permite restaurarla.`"
      confirm-label="Eliminar"
      danger
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="pendingDelete = null"
    />
  </section>
</template>
