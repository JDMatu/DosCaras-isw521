<script setup lang="ts">
/**
 * Screen 5 — create (`/views/new`) and edit (`/views/:id/edit`) a publication.
 *
 * PDF ↔ API divergence #1: the spec asks for a "publication title (max 120
 * chars)", but `PoliticalView` has NO title column — the API stores one title
 * per side (`ViewSide.title`). The 120-character limit with a live counter is
 * therefore applied to each side's title instead.
 *
 * PDF ↔ API divergence #2: the spec asks for 400 errors mapped inline to the
 * failing field, but the backend answers with
 * `{ error: 'Validation failed', details: { fieldErrors: { body: [...] } } }`
 * — a flat list of zod messages with no field names — so they are rendered as
 * a global alert list. Everything checkable client-side is validated inline
 * before submitting so this path is a last resort.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect, { type SelectOption } from '@/components/ui/BaseSelect.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import HashtagInput from '@/components/form/HashtagInput.vue'
import SourcesEditor from '@/components/form/SourcesEditor.vue'
import {
  createSourceDraft,
  draftFromSource,
  hasSourceErrors,
  isSourceDraftData,
  toDraftData,
  type SourceDraft,
  type SourceDraftData,
} from '@/components/form/sourceDraft'
import { CACHE_KEYS, cacheRead, cacheRemove, cacheWrite } from '@/lib/cache'
import { ApiError, errorMessage } from '@/lib/http'
import * as viewsService from '@/services/views'
import { useAuthStore } from '@/stores/auth'
import { useCatalogStore } from '@/stores/catalog'
import { useToastsStore } from '@/stores/toasts'
import type { CreateViewInput, CreateViewSideInput } from '@/types/api'

const MAX_TITLE_LENGTH = 120
const MIN_DESCRIPTION_LENGTH = 100

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const catalog = useCatalogStore()
const toasts = useToastsStore()

const editId = computed(() =>
  route.name === 'view-edit' && typeof route.params.id === 'string' ? route.params.id : null,
)
const isEdit = computed(() => editId.value !== null)

/* ---------------------------------------------------------------- form state */

const categoryId = ref('')
const sideTitle = ref('')
const sideDescription = ref('')
const counterpartTitle = ref('')
const counterpartDescription = ref('')
const hashtags = ref<string[]>([])
const sideSources = ref<SourceDraft[]>([createSourceDraft()])
const counterpartSources = ref<SourceDraft[]>([createSourceDraft()])

const loadingView = ref(false)
const loadFailure = ref('')
const notFound = ref(false)
const accessDenied = ref(false)
const submitting = ref(false)
const showErrors = ref(false)
const globalError = ref('')
const apiValidationMessages = ref<string[]>([])

const categoryOptions = computed<SelectOption[]>(() =>
  catalog.categories.map((category) => ({ value: category.id, label: category.name })),
)

/* ---------------------------------------------------------------- validation */

interface FormErrors {
  categoryId?: string
  sideTitle?: string
  sideDescription?: string
  counterpartTitle?: string
  counterpartDescription?: string
}

function titleError(value: string): string | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return 'El título es obligatorio.'
  if (trimmed.length > MAX_TITLE_LENGTH)
    return `El título no puede superar ${MAX_TITLE_LENGTH} caracteres.`
  return undefined
}

function descriptionError(value: string): string | undefined {
  const trimmed = value.trim()
  if (trimmed === '') return 'La descripción es obligatoria.'
  if (trimmed.length < MIN_DESCRIPTION_LENGTH)
    return `La descripción debe tener al menos ${MIN_DESCRIPTION_LENGTH} caracteres (llevás ${trimmed.length}).`
  return undefined
}

const errors = computed<FormErrors>(() => ({
  categoryId: categoryId.value === '' ? 'Elegí una categoría.' : undefined,
  sideTitle: titleError(sideTitle.value),
  sideDescription: descriptionError(sideDescription.value),
  counterpartTitle: titleError(counterpartTitle.value),
  counterpartDescription: descriptionError(counterpartDescription.value),
}))

const isValid = computed(
  () =>
    Object.values(errors.value).every((message) => message === undefined) &&
    !hasSourceErrors(sideSources.value) &&
    !hasSourceErrors(counterpartSources.value),
)

function fieldError(key: keyof FormErrors): string | undefined {
  return showErrors.value ? errors.value[key] : undefined
}

/* -------------------------------------------------- draft (create mode only) */

interface DraftPayload {
  categoryId: string
  sideTitle: string
  sideDescription: string
  counterpartTitle: string
  counterpartDescription: string
  hashtags: string[]
  sideSources: SourceDraftData[]
  counterpartSources: SourceDraftData[]
}

function buildDraft(): DraftPayload {
  return {
    categoryId: categoryId.value,
    sideTitle: sideTitle.value,
    sideDescription: sideDescription.value,
    counterpartTitle: counterpartTitle.value,
    counterpartDescription: counterpartDescription.value,
    hashtags: [...hashtags.value],
    sideSources: sideSources.value.map(toDraftData),
    counterpartSources: counterpartSources.value.map(toDraftData),
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isDraftPayload(value: unknown): value is DraftPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'categoryId' in value &&
    typeof value.categoryId === 'string' &&
    'sideTitle' in value &&
    typeof value.sideTitle === 'string' &&
    'sideDescription' in value &&
    typeof value.sideDescription === 'string' &&
    'counterpartTitle' in value &&
    typeof value.counterpartTitle === 'string' &&
    'counterpartDescription' in value &&
    typeof value.counterpartDescription === 'string' &&
    'hashtags' in value &&
    isStringArray(value.hashtags) &&
    'sideSources' in value &&
    Array.isArray(value.sideSources) &&
    value.sideSources.every(isSourceDraftData) &&
    'counterpartSources' in value &&
    Array.isArray(value.counterpartSources) &&
    value.counterpartSources.every(isSourceDraftData)
  )
}

function applyDraft(draft: DraftPayload): void {
  categoryId.value = draft.categoryId
  sideTitle.value = draft.sideTitle
  sideDescription.value = draft.sideDescription
  counterpartTitle.value = draft.counterpartTitle
  counterpartDescription.value = draft.counterpartDescription
  hashtags.value = [...draft.hashtags]
  sideSources.value =
    draft.sideSources.length > 0 ? draft.sideSources.map(createSourceDraft) : [createSourceDraft()]
  counterpartSources.value =
    draft.counterpartSources.length > 0
      ? draft.counterpartSources.map(createSourceDraft)
      : [createSourceDraft()]
}

const pendingDraft = ref<DraftPayload | null>(null)
const restorePromptOpen = ref(false)

function restoreDraft(): void {
  const draft = pendingDraft.value
  if (draft !== null) applyDraft(draft)
  pendingDraft.value = null
  restorePromptOpen.value = false
  toasts.info('Borrador restaurado.')
}

function discardDraft(): void {
  cacheRemove(CACHE_KEYS.draft)
  pendingDraft.value = null
  restorePromptOpen.value = false
}

/** Escape / backdrop only closes the prompt; the draft is deleted solely by
 * the explicit "Descartar" button. */
function dismissDraftPrompt(): void {
  pendingDraft.value = null
  restorePromptOpen.value = false
}

/* ------------------------------------------------------------ dirty tracking */

const snapshot = computed(() => JSON.stringify(buildDraft()))
const pristine = ref(snapshot.value)
const isDirty = computed(() => snapshot.value !== pristine.value)

let draftTimer: ReturnType<typeof setTimeout> | undefined

watch(snapshot, () => {
  // Spec §3.5: only the "new publication" form is persisted as a draft.
  if (isEdit.value || restorePromptOpen.value || !isDirty.value) return
  clearTimeout(draftTimer)
  draftTimer = setTimeout(() => cacheWrite<DraftPayload>(CACHE_KEYS.draft, buildDraft()), 600)
})

onBeforeUnmount(() => clearTimeout(draftTimer))

/* ------------------------------------------------------------------- loading */

async function loadForEdit(id: string): Promise<void> {
  loadingView.value = true
  loadFailure.value = ''
  notFound.value = false
  accessDenied.value = false
  try {
    const { view } = await viewsService.getView(id)
    if (auth.user?.id !== view.authorId && !auth.isSuperadmin) {
      accessDenied.value = true
      return
    }
    // Sides come back in no guaranteed order: always match by `type`.
    const side = view.sides.find((s) => s.type === 'SIDE')
    const counterpart = view.sides.find((s) => s.type === 'COUNTERPART')
    categoryId.value = view.categoryId
    sideTitle.value = side?.title ?? ''
    sideDescription.value = side?.description ?? ''
    counterpartTitle.value = counterpart?.title ?? ''
    counterpartDescription.value = counterpart?.description ?? ''
    hashtags.value = view.hashtags.map((tag) => tag.name)
    sideSources.value =
      side !== undefined && side.sources.length > 0
        ? side.sources.map(draftFromSource)
        : [createSourceDraft()]
    counterpartSources.value =
      counterpart !== undefined && counterpart.sources.length > 0
        ? counterpart.sources.map(draftFromSource)
        : [createSourceDraft()]
    pristine.value = snapshot.value
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound.value = true
    else if (err instanceof ApiError && err.status === 403) accessDenied.value = true
    else loadFailure.value = errorMessage(err)
  } finally {
    loadingView.value = false
  }
}

function resetForm(): void {
  categoryId.value = ''
  sideTitle.value = ''
  sideDescription.value = ''
  counterpartTitle.value = ''
  counterpartDescription.value = ''
  hashtags.value = []
  sideSources.value = [createSourceDraft()]
  counterpartSources.value = [createSourceDraft()]
  showErrors.value = false
  globalError.value = ''
  apiValidationMessages.value = []
  notFound.value = false
  accessDenied.value = false
  loadFailure.value = ''
  pristine.value = snapshot.value
}

function init(): void {
  if (catalog.categories.length === 0) void catalog.loadCategories()
  const id = editId.value
  if (id !== null) {
    void loadForEdit(id)
    return
  }
  const cached = cacheRead<unknown>(CACHE_KEYS.draft)
  if (cached !== null && isDraftPayload(cached.value)) {
    pendingDraft.value = cached.value
    restorePromptOpen.value = true
  } else if (cached !== null) {
    cacheRemove(CACHE_KEYS.draft)
  }
}

onMounted(init)

// `/views/new` and `/views/:id/edit` render the same component, so the router
// may patch the instance instead of remounting it: re-initialise explicitly.
watch(editId, (id, previous) => {
  if (id === previous) return
  clearTimeout(draftTimer)
  resetForm()
  init()
})

/* ---------------------------------------------------------------- submitting */

function toSideInput(title: string, description: string, drafts: SourceDraft[]): CreateViewSideInput {
  return {
    title: title.trim(),
    description: description.trim(),
    sources: drafts.map((draft) => {
      const label = draft.label.trim()
      return {
        type: draft.type,
        url: draft.url.trim(),
        ...(label === '' ? {} : { label }),
      }
    }),
  }
}

/** Flattens `{ formErrors, fieldErrors: { body: [...] } }` into a message list. */
function validationMessages(details: unknown): string[] {
  if (typeof details !== 'object' || details === null) return []
  const messages: string[] = []
  if ('formErrors' in details && isStringArray(details.formErrors)) {
    messages.push(...details.formErrors)
  }
  if ('fieldErrors' in details) {
    const fieldErrors = details.fieldErrors
    if (typeof fieldErrors === 'object' && fieldErrors !== null) {
      for (const group of Object.values(fieldErrors)) {
        if (isStringArray(group)) messages.push(...group)
      }
    }
  }
  return messages
}

async function submit(): Promise<void> {
  showErrors.value = true
  globalError.value = ''
  apiValidationMessages.value = []
  if (!isValid.value) {
    toasts.error('Revisá los campos marcados antes de continuar.')
    return
  }
  submitting.value = true
  try {
    const input: CreateViewInput = {
      categoryId: categoryId.value,
      side: toSideInput(sideTitle.value, sideDescription.value, sideSources.value),
      counterpart: toSideInput(
        counterpartTitle.value,
        counterpartDescription.value,
        counterpartSources.value,
      ),
      ...(hashtags.value.length > 0 ? { hashtags: [...hashtags.value] } : {}),
    }
    const id = editId.value
    const { view } =
      id !== null ? await viewsService.updateView(id, input) : await viewsService.createView(input)
    if (id === null) {
      // Cancel any queued autosave first, otherwise it would rewrite the draft.
      clearTimeout(draftTimer)
      cacheRemove(CACHE_KEYS.draft)
    }
    pristine.value = snapshot.value
    toasts.success(id !== null ? 'Publicación actualizada.' : 'Publicación creada.')
    await router.push({ name: 'view-detail', params: { id: view.id } })
  } catch (err) {
    if (err instanceof ApiError && (err.status === 400 || err.status === 422)) {
      apiValidationMessages.value = validationMessages(err.details)
      if (apiValidationMessages.value.length === 0) globalError.value = errorMessage(err)
    } else if (err instanceof ApiError && err.status === 403) {
      globalError.value = 'No tenés permisos para editar esta publicación.'
    } else {
      globalError.value = errorMessage(err)
    }
  } finally {
    submitting.value = false
  }
}

/* -------------------------------------------------------------------- cancel */

const cancelPromptOpen = ref(false)

function requestCancel(): void {
  if (isDirty.value) cancelPromptOpen.value = true
  else void router.back()
}

function confirmCancel(): void {
  cancelPromptOpen.value = false
  void router.back()
}
</script>

<template>
  <section class="mx-auto max-w-4xl">
    <div v-if="loadingView" class="flex flex-col items-center gap-3 py-16">
      <LoadingSpinner class="size-8 text-amber-700 dark:text-amber-500" />
      <p role="status" class="text-sm text-stone-500 dark:text-stone-400">
        Cargando la publicación…
      </p>
    </div>

    <div
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
    </div>

    <div
      v-else-if="accessDenied"
      role="alert"
      class="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center dark:border-red-900 dark:bg-red-950/40"
    >
      <h1 class="text-xl font-bold text-red-900 dark:text-red-100">Acceso denegado</h1>
      <p class="text-sm text-red-800 dark:text-red-200">
        Solo el autor de la publicación o un superadministrador pueden editarla.
      </p>
      <RouterLink
        v-if="editId"
        :to="{ name: 'view-detail', params: { id: editId } }"
        class="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
      >
        Ver la publicación
      </RouterLink>
    </div>

    <ErrorState
      v-else-if="loadFailure"
      :message="loadFailure"
      retryable
      @retry="editId && loadForEdit(editId)"
    />

    <template v-else>
      <h1 class="mb-1 text-2xl font-bold text-stone-900 dark:text-stone-50">
        {{ isEdit ? 'Editar publicación' : 'Nueva publicación' }}
      </h1>
      <p class="mb-6 text-sm text-stone-600 dark:text-stone-300">
        Toda publicación necesita sus dos caras: una postura y su contrapostura, cada una con sus
        propias fuentes.
      </p>

      <form novalidate class="flex flex-col gap-6" @submit.prevent="submit">
        <BaseSelect
          v-model="categoryId"
          label="Categoría"
          required
          placeholder="Elegí una categoría"
          :options="categoryOptions"
          :error="fieldError('categoryId')"
          :disabled="submitting || categoryOptions.length === 0"
          :hint="
            categoryOptions.length === 0 ? 'No se pudieron cargar las categorías.' : undefined
          "
        />

        <fieldset class="flex flex-col gap-4 rounded-xl border border-amber-300 p-4 dark:border-amber-800">
          <legend class="px-1 text-sm font-semibold text-amber-900 dark:text-amber-300">
            Postura (Lado A)
          </legend>
          <BaseInput
            v-model="sideTitle"
            label="Título de la postura"
            required
            :error="fieldError('sideTitle')"
            :hint="`${sideTitle.trim().length}/${MAX_TITLE_LENGTH} caracteres.`"
            :disabled="submitting"
            placeholder="Ej. El teletrabajo mejora la productividad"
          />
          <BaseTextarea
            v-model="sideDescription"
            label="Argumento principal"
            required
            :rows="6"
            :error="fieldError('sideDescription')"
            :hint="`${sideDescription.trim().length}/${MIN_DESCRIPTION_LENGTH} caracteres mínimos.`"
            :disabled="submitting"
            placeholder="Desarrollá el argumento con al menos 100 caracteres…"
          />
        </fieldset>

        <fieldset class="flex flex-col gap-4 rounded-xl border border-stone-300 p-4 dark:border-stone-600">
          <legend class="px-1 text-sm font-semibold text-stone-800 dark:text-stone-100">
            Contrapostura (Lado B)
          </legend>
          <BaseInput
            v-model="counterpartTitle"
            label="Título de la contrapostura"
            required
            :error="fieldError('counterpartTitle')"
            :hint="`${counterpartTitle.trim().length}/${MAX_TITLE_LENGTH} caracteres.`"
            :disabled="submitting"
            placeholder="Ej. El teletrabajo debilita la colaboración"
          />
          <BaseTextarea
            v-model="counterpartDescription"
            label="Argumento opuesto"
            required
            :rows="6"
            :error="fieldError('counterpartDescription')"
            :hint="`${counterpartDescription.trim().length}/${MIN_DESCRIPTION_LENGTH} caracteres mínimos.`"
            :disabled="submitting"
            placeholder="Desarrollá la contrapostura con al menos 100 caracteres…"
          />
        </fieldset>

        <HashtagInput v-model="hashtags" label="Hashtags" :disabled="submitting" />

        <SourcesEditor
          v-model="sideSources"
          legend="Fuentes de la Postura (Lado A)"
          description="Al menos una fuente es obligatoria. Podés combinar enlaces, videos y documentos."
          :show-errors="showErrors"
          :disabled="submitting"
        />

        <SourcesEditor
          v-model="counterpartSources"
          legend="Fuentes de la Contrapostura (Lado B)"
          description="Independientes de las del Lado A: al menos una fuente es obligatoria."
          :show-errors="showErrors"
          :disabled="submitting"
        />

        <div
          v-if="apiValidationMessages.length > 0"
          role="alert"
          class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          <p class="mb-1 font-medium">El servidor rechazó los datos enviados:</p>
          <ul class="list-inside list-disc">
            <li v-for="(message, index) in apiValidationMessages" :key="index">{{ message }}</li>
          </ul>
        </div>

        <p
          v-if="globalError"
          role="alert"
          class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {{ globalError }}
        </p>

        <div class="flex flex-wrap justify-end gap-3">
          <BaseButton variant="secondary" :disabled="submitting" @click="requestCancel">
            Cancelar
          </BaseButton>
          <BaseButton type="submit" :loading="submitting" :disabled="submitting">
            {{ isEdit ? 'Guardar cambios' : 'Publicar' }}
          </BaseButton>
        </div>
      </form>
    </template>

    <BaseModal :open="restorePromptOpen" title="¿Restaurar borrador?" @close="dismissDraftPrompt">
      <p class="text-sm text-stone-600 dark:text-stone-300">
        Encontramos un borrador guardado de una publicación sin terminar. ¿Querés continuar desde
        donde lo dejaste?
      </p>
      <div class="mt-6 flex justify-end gap-3">
        <BaseButton variant="secondary" @click="discardDraft">Descartar</BaseButton>
        <BaseButton @click="restoreDraft">Restaurar</BaseButton>
      </div>
    </BaseModal>

    <ConfirmDialog
      :open="cancelPromptOpen"
      title="Descartar cambios"
      message="Tenés cambios sin guardar. Si salís ahora se perderán de esta pantalla."
      confirm-label="Salir sin guardar"
      cancel-label="Seguir editando"
      danger
      @confirm="confirmCancel"
      @cancel="cancelPromptOpen = false"
    />
  </section>
</template>
