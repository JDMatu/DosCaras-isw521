<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { ApiError, errorMessage } from '@/lib/http'
import * as authService from '@/services/auth'
import { useToastsStore } from '@/stores/toasts'

const router = useRouter()
const toasts = useToastsStore()

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const submitting = ref(false)
const activating = ref(false)
const globalError = ref('')
const fieldErrors = ref<{ name?: string; email?: string; password?: string; passwordConfirm?: string }>({})

const activationToken = ref<string | null>(null)
const registeredEmail = ref('')

const passwordStrength = computed(() => {
  const value = password.value
  if (value.length === 0) return { score: 0, label: '', color: '' }
  let score = 0
  if (value.length >= 8) score++
  if (value.length >= 12) score++
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++
  if (/\d/.test(value)) score++
  if (/[^A-Za-z0-9]/.test(value)) score++
  if (score <= 1) return { score, label: 'Débil', color: 'bg-red-500' }
  if (score <= 3) return { score, label: 'Media', color: 'bg-amber-500' }
  return { score, label: 'Fuerte', color: 'bg-green-600' }
})

function validate(): boolean {
  const errors: typeof fieldErrors.value = {}
  if (name.value.trim().length < 3) errors.name = 'El nombre debe tener al menos 3 caracteres.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()))
    errors.email = 'Ingresá un correo electrónico válido.'
  if (password.value.length < 8)
    errors.password = 'La contraseña debe tener al menos 8 caracteres.'
  if (passwordConfirm.value !== password.value)
    errors.passwordConfirm = 'Las contraseñas no coinciden.'
  fieldErrors.value = errors
  return Object.keys(errors).length === 0
}

async function submit(): Promise<void> {
  globalError.value = ''
  if (!validate()) return
  submitting.value = true
  try {
    const response = await authService.register({
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
    })
    activationToken.value = response.activationToken
    registeredEmail.value = response.user.email
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      fieldErrors.value = { email: 'El correo ya está registrado.' }
    } else {
      globalError.value = errorMessage(err)
    }
  } finally {
    submitting.value = false
  }
}

async function activateAccount(): Promise<void> {
  if (activationToken.value === null) return
  activating.value = true
  try {
    await authService.activate(activationToken.value)
    toasts.success('¡Cuenta activada! Ya podés iniciar sesión.')
    await router.push({ name: 'login' })
  } catch (err) {
    globalError.value = errorMessage(err)
  } finally {
    activating.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-md">
    <template v-if="activationToken === null">
      <h1 class="mb-1 text-2xl font-bold text-stone-900 dark:text-stone-50">Crear cuenta</h1>
      <p class="mb-6 text-sm text-stone-600 dark:text-stone-300">
        Unite a la conversación: cada tema tiene dos caras.
      </p>

      <form novalidate class="flex flex-col gap-4" @submit.prevent="submit">
        <BaseInput
          v-model="name"
          label="Nombre completo"
          autocomplete="name"
          required
          :error="fieldErrors.name"
          :disabled="submitting"
        />
        <BaseInput
          v-model="email"
          label="Correo electrónico"
          type="email"
          autocomplete="email"
          required
          :error="fieldErrors.email"
          :disabled="submitting"
        />
        <div>
          <BaseInput
            v-model="password"
            label="Contraseña"
            type="password"
            autocomplete="new-password"
            required
            hint="Mínimo 8 caracteres."
            :error="fieldErrors.password"
            :disabled="submitting"
          />
          <div v-if="password.length > 0" class="mt-2">
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700" aria-hidden="true">
              <div
                class="h-full transition-all"
                :class="passwordStrength.color"
                :style="{ width: `${(passwordStrength.score / 5) * 100}%` }"
              ></div>
            </div>
            <p class="mt-1 text-xs text-stone-500 dark:text-stone-400" role="status">
              Fortaleza: {{ passwordStrength.label }}
            </p>
          </div>
        </div>
        <BaseInput
          v-model="passwordConfirm"
          label="Confirmar contraseña"
          type="password"
          autocomplete="new-password"
          required
          :error="fieldErrors.passwordConfirm"
          :disabled="submitting"
        />

        <p v-if="globalError" role="alert" class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {{ globalError }}
        </p>

        <BaseButton type="submit" :loading="submitting" :disabled="submitting">
          Registrarse
        </BaseButton>
      </form>

      <p class="mt-6 text-center text-sm text-stone-600 dark:text-stone-300">
        ¿Ya tenés cuenta?
        <RouterLink :to="{ name: 'login' }" class="font-medium text-amber-800 hover:underline dark:text-amber-400">
          Iniciá sesión
        </RouterLink>
      </p>
    </template>

    <template v-else>
      <h1 class="mb-1 text-2xl font-bold text-stone-900 dark:text-stone-50">Activá tu cuenta</h1>
      <p class="mb-6 text-sm text-stone-600 dark:text-stone-300">
        Tu cuenta <strong>{{ registeredEmail }}</strong> fue creada y está pendiente de
        activación. En un entorno real recibirías este enlace por correo; aquí podés activarla
        directamente.
      </p>
      <p v-if="globalError" role="alert" class="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
        {{ globalError }}
      </p>
      <BaseButton :loading="activating" :disabled="activating" @click="activateAccount">
        Activar mi cuenta
      </BaseButton>
    </template>
  </section>
</template>
