<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { ApiError, errorMessage } from '@/lib/http'
import { useAuthStore } from '@/stores/auth'
import { useFavoritesStore } from '@/stores/favorites'
import { useToastsStore } from '@/stores/toasts'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const favorites = useFavoritesStore()
const toasts = useToastsStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const globalError = ref('')

const expired = computed(() => auth.sessionExpired)

async function submit(): Promise<void> {
  globalError.value = ''
  if (email.value.trim() === '' || password.value === '') {
    globalError.value = 'Ingresá tu correo y contraseña.'
    return
  }
  submitting.value = true
  try {
    await auth.login(email.value.trim(), password.value)
    favorites.sync().catch(() => {
      // Favorites remain available from the local cache while offline.
    })
    toasts.success(`¡Bienvenido, ${auth.user?.name}!`)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    await router.push(redirect ?? { name: 'board' })
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      globalError.value = 'Correo o contraseña incorrectos.'
    } else if (err instanceof ApiError && err.status === 403) {
      globalError.value =
        err.message === 'Account is pending activation'
          ? 'Tu cuenta todavía no está activada. Revisá el enlace de activación que recibiste al registrarte.'
          : 'Tu cuenta está suspendida. Contactá a un administrador.'
    } else {
      globalError.value = errorMessage(err)
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-md">
    <h1 class="mb-1 text-2xl font-bold text-stone-900 dark:text-stone-50">Iniciar sesión</h1>
    <p class="mb-6 text-sm text-stone-600 dark:text-stone-300">
      Accedé para reaccionar, comentar y publicar tus propias perspectivas.
    </p>

    <p
      v-if="expired"
      role="alert"
      class="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
    >
      Su sesión ha expirado. Iniciá sesión nuevamente.
    </p>

    <form novalidate class="flex flex-col gap-4" @submit.prevent="submit">
      <BaseInput
        v-model="email"
        label="Correo electrónico"
        type="email"
        autocomplete="email"
        required
        placeholder="vos@ejemplo.com"
        :disabled="submitting"
      />
      <BaseField v-slot="{ id, describedBy }" label="Contraseña" required>
        <div class="relative">
          <input
            :id="id"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            required
            autocomplete="current-password"
            :disabled="submitting"
            :aria-describedby="describedBy"
            class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 pr-24 text-sm text-stone-900 hover:border-stone-400 disabled:cursor-not-allowed disabled:bg-stone-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:border-stone-500 dark:disabled:bg-stone-900"
          />
          <button
            type="button"
            class="absolute inset-y-1 right-1 rounded-md px-2 text-xs font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-700"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? 'Ocultar' : 'Mostrar' }}
          </button>
        </div>
      </BaseField>

      <p v-if="globalError" role="alert" class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
        {{ globalError }}
      </p>

      <BaseButton type="submit" :loading="submitting" :disabled="submitting">
        Iniciar sesión
      </BaseButton>
    </form>

    <p class="mt-6 text-center text-sm text-stone-600 dark:text-stone-300">
      ¿No tenés cuenta?
      <RouterLink :to="{ name: 'register' }" class="font-medium text-amber-800 hover:underline dark:text-amber-400">
        Registrate
      </RouterLink>
    </p>
  </section>
</template>
