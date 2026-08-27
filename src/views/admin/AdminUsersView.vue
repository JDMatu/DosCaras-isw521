<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import PaginationControls from '@/components/ui/PaginationControls.vue'
import StatusBadge, { type BadgeTone } from '@/components/admin/StatusBadge.vue'
import { useDebouncedRef } from '@/composables/useDebouncedRef'
import { ApiError, errorMessage } from '@/lib/http'
import { formatDate } from '@/lib/format'
import * as adminService from '@/services/admin'
import { useAuthStore } from '@/stores/auth'
import { useToastsStore } from '@/stores/toasts'
import type { ApiUser, Role, UserStatus } from '@/types/api'

const LIMIT = 10

const auth = useAuthStore()
const toasts = useToastsStore()

const ROLE_LABELS: Record<Role, string> = {
  USER: 'Usuario',
  SUPERADMIN: 'Superadministrador',
}

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Activo',
  PENDING: 'Pendiente',
  SUSPENDED: 'Suspendido',
}

const STATUS_TONES: Record<UserStatus, BadgeTone> = {
  ACTIVE: 'green',
  PENDING: 'amber',
  SUSPENDED: 'red',
}

const users = ref<ApiUser[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const error = ref('')
const forbidden = ref(false)

const search = useDebouncedRef('', 300)

const pendingUser = ref<ApiUser | null>(null)
const actionPending = ref(false)

const confirmMessage = computed(() => {
  if (!pendingUser.value) return ''
  return pendingUser.value.status === 'ACTIVE'
    ? `${pendingUser.value.name} no podrá iniciar sesión hasta que reactivés su cuenta.`
    : `${pendingUser.value.name} volverá a tener acceso a la plataforma.`
})

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  forbidden.value = false
  try {
    const response = await adminService.listUsers({
      search: search.value.trim() || undefined,
      page: page.value,
      limit: LIMIT,
    })
    users.value = response.users
    total.value = response.total
  } catch (err) {
    users.value = []
    total.value = 0
    if (err instanceof ApiError && err.status === 403) {
      forbidden.value = true
      error.value =
        'No tenés permisos para administrar usuarios. Esta sección requiere el rol de superadministrador.'
    } else {
      error.value = errorMessage(err)
    }
  } finally {
    loading.value = false
  }
}

watch(search, () => {
  page.value = 1
  void load()
})

function goToPage(next: number): void {
  page.value = next
  void load()
}

function isSelf(user: ApiUser): boolean {
  return user.id === auth.user?.id
}

async function confirmAction(): Promise<void> {
  const target = pendingUser.value
  if (!target) return
  actionPending.value = true
  try {
    const { user: updated } =
      target.status === 'ACTIVE'
        ? await adminService.banUser(target.id)
        : await adminService.unbanUser(target.id)
    users.value = users.value.map((row) => (row.id === updated.id ? updated : row))
    toasts.success(
      updated.status === 'SUSPENDED'
        ? `Se suspendió la cuenta de ${updated.name}.`
        : `Se reactivó la cuenta de ${updated.name}.`,
    )
    pendingUser.value = null
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
      <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-50">Gestión de usuarios</h1>
      <p class="mt-1 text-sm text-stone-600 dark:text-stone-300">
        Consultá las cuentas registradas y suspendé o reactivá el acceso a la plataforma.
      </p>
    </header>

    <div class="max-w-md">
      <BaseInput
        v-model="search"
        label="Buscar por nombre o correo"
        type="search"
        placeholder="Ej.: maría o maria@ejemplo.com"
        hint="La búsqueda se ejecuta automáticamente mientras escribís."
      />
    </div>

    <div v-if="loading" class="flex items-center justify-center gap-3 py-16" role="status">
      <LoadingSpinner class="size-6 text-amber-700 dark:text-amber-400" />
      <span class="text-sm text-stone-600 dark:text-stone-300">Cargando usuarios…</span>
    </div>

    <ErrorState v-else-if="error" :message="error" :retryable="!forbidden" @retry="load" />

    <EmptyState
      v-else-if="users.length === 0"
      title="No se encontraron usuarios para la búsqueda"
      description="Probá con otro nombre o correo, o limpiá el campo de búsqueda para ver todas las cuentas."
    />

    <template v-else>
      <div class="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
        <table class="w-full min-w-[46rem] border-collapse text-left text-sm">
          <caption class="sr-only">
            Usuarios registrados con su rol, estado y fecha de registro
          </caption>
          <thead class="bg-stone-100 text-xs uppercase tracking-wide text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            <tr>
              <th scope="col" class="px-4 py-3 font-semibold">Nombre</th>
              <th scope="col" class="px-4 py-3 font-semibold">Correo</th>
              <th scope="col" class="px-4 py-3 font-semibold">Rol</th>
              <th scope="col" class="px-4 py-3 font-semibold">Estado</th>
              <th scope="col" class="px-4 py-3 font-semibold">Registro</th>
              <th scope="col" class="px-4 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-200 dark:divide-stone-700">
            <tr v-for="user in users" :key="user.id" class="bg-white dark:bg-stone-900">
              <th scope="row" class="px-4 py-3 font-medium text-stone-900 dark:text-stone-100">
                {{ user.name }}
                <span v-if="isSelf(user)" class="ml-1 text-xs font-normal text-stone-500 dark:text-stone-400">
                  (vos)
                </span>
              </th>
              <td class="px-4 py-3 text-stone-600 dark:text-stone-300">{{ user.email }}</td>
              <td class="px-4 py-3 text-stone-600 dark:text-stone-300">
                {{ ROLE_LABELS[user.role] }}
              </td>
              <td class="px-4 py-3">
                <StatusBadge :tone="STATUS_TONES[user.status]">
                  {{ STATUS_LABELS[user.status] }}
                </StatusBadge>
              </td>
              <td class="px-4 py-3 text-stone-600 dark:text-stone-300">
                <time :datetime="user.createdAt">{{ formatDate(user.createdAt) }}</time>
              </td>
              <td class="px-4 py-3 text-right">
                <BaseButton
                  v-if="user.status !== 'PENDING' && !isSelf(user)"
                  :variant="user.status === 'ACTIVE' ? 'danger' : 'secondary'"
                  :disabled="actionPending"
                  @click="pendingUser = user"
                >
                  {{ user.status === 'ACTIVE' ? 'Suspender' : 'Reactivar' }}
                </BaseButton>
                <span v-else-if="isSelf(user)" class="inline-flex items-center gap-2">
                  <BaseButton
                    variant="secondary"
                    disabled
                    title="No podés suspender tu propia cuenta de superadministrador."
                    aria-describedby="self-ban-note"
                  >
                    Suspender
                  </BaseButton>
                  <span id="self-ban-note" class="sr-only">
                    No podés suspender tu propia cuenta de superadministrador.
                  </span>
                </span>
                <span
                  v-else
                  class="text-stone-500 dark:text-stone-400"
                  title="La cuenta todavía no fue activada, no puede suspenderse."
                >
                  <span aria-hidden="true">—</span>
                  <span class="sr-only">
                    Sin acciones: la cuenta está pendiente de activación.
                  </span>
                </span>
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
      :open="pendingUser !== null"
      :title="pendingUser?.status === 'ACTIVE' ? 'Suspender cuenta' : 'Reactivar cuenta'"
      :message="confirmMessage"
      :confirm-label="pendingUser?.status === 'ACTIVE' ? 'Suspender' : 'Reactivar'"
      :danger="pendingUser?.status === 'ACTIVE'"
      :loading="actionPending"
      @confirm="confirmAction"
      @cancel="pendingUser = null"
    />
  </section>
</template>
