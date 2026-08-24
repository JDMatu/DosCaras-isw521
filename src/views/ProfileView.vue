<script setup lang="ts">

import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import ProfileFavoritesTab from '@/components/profile/ProfileFavoritesTab.vue'
import ProfileHistoryTab from '@/components/profile/ProfileHistoryTab.vue'
import ProfilePublicationsTab from '@/components/profile/ProfilePublicationsTab.vue'
import ProfileTabs from '@/components/profile/ProfileTabs.vue'
import { formatDate } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { useFavoritesStore } from '@/stores/favorites'
import { useToastsStore } from '@/stores/toasts'
import type { Role, UserStatus } from '@/types/api'

const router = useRouter()
const auth = useAuthStore()
const favorites = useFavoritesStore()
const toasts = useToastsStore()

const ROLE_LABELS: Record<Role, string> = {
  USER: 'Usuario',
  SUPERADMIN: 'Superadministrador',
}

const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Activa',
  PENDING: 'Pendiente de activación',
  SUSPENDED: 'Suspendida',
}

const STATUS_CLASSES: Record<UserStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200',
  PENDING: 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200',
  SUSPENDED: 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200',
}

const user = computed(() => auth.user)

const tabs = [
  { id: 'publications', label: 'Mis publicaciones' },
  { id: 'favorites', label: 'Mis favoritos' },
  { id: 'history', label: 'Historial' },
]

const activeTab = ref<string>('publications')

async function logout(): Promise<void> {
  auth.logout()
  favorites.clear()
  toasts.success('Cerraste sesión correctamente.')
  await router.push({ name: 'board' })
}
</script>

<template>
  <section v-if="user" class="flex flex-col gap-8">
    <header class="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-900">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-50">{{ user.name }}</h1>
          <p class="text-sm text-stone-600 dark:text-stone-300">{{ user.email }}</p>
        </div>
        <BaseButton variant="secondary" @click="logout">Cerrar sesión</BaseButton>
      </div>

      <dl class="mt-6 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt class="font-medium text-stone-500 dark:text-stone-400">Rol</dt>
          <dd class="mt-1 text-stone-900 dark:text-stone-100">{{ ROLE_LABELS[user.role] }}</dd>
        </div>
        <div>
          <dt class="font-medium text-stone-500 dark:text-stone-400">Estado de la cuenta</dt>
          <dd class="mt-1">
            <span
              class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="STATUS_CLASSES[user.status]"
            >
              {{ STATUS_LABELS[user.status] }}
            </span>
          </dd>
        </div>
        <div>
          <dt class="font-medium text-stone-500 dark:text-stone-400">Fecha de registro</dt>
          <dd class="mt-1 text-stone-900 dark:text-stone-100">
            <time :datetime="user.createdAt">{{ formatDate(user.createdAt) }}</time>
          </dd>
        </div>
      </dl>
    </header>

    <div>
      <ProfileTabs v-model="activeTab" :tabs="tabs" />

      <div class="pt-6">
        <div
          v-if="activeTab === 'publications'"
          id="profile-panel-publications"
          role="tabpanel"
          aria-labelledby="profile-tab-publications"
          tabindex="0"
        >
          <ProfilePublicationsTab />
        </div>
        <div
          v-else-if="activeTab === 'favorites'"
          id="profile-panel-favorites"
          role="tabpanel"
          aria-labelledby="profile-tab-favorites"
          tabindex="0"
        >
          <ProfileFavoritesTab />
        </div>
        <div
          v-else
          id="profile-panel-history"
          role="tabpanel"
          aria-labelledby="profile-tab-history"
          tabindex="0"
        >
          <ProfileHistoryTab />
        </div>
      </div>
    </div>
  </section>
</template>
