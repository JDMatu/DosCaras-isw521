<script setup lang="ts">
/**
 * Dynamic list of sources for one side of a view. At least one source per side
 * is required by the API, so the last remaining row cannot be deleted.
 *
 * DOCUMENT rows can upload a file to `POST /api/uploads/document`; the endpoint
 * answers with a RELATIVE url (`/uploads/...`) but the create/update endpoints
 * validate `url` with `z.string().url()`, so the url is stored absolute.
 */
import { ref, useId } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
import { errorMessage } from '@/lib/http'
import { youtubeEmbedUrl, youtubeVideoId } from '@/lib/youtube'
import { absoluteUploadUrl, uploadDocument } from '@/services/uploads'
import type { SourceType } from '@/types/api'
import {
  UPLOAD_ACCEPT,
  createSourceDraft,
  formatFileSize,
  sourceDraftError,
  type SourceDraft,
  uploadValidationError,
} from './sourceDraft'

const props = defineProps<{
  legend: string
  description: string
  /** When true, per-row validation messages are rendered. */
  showErrors: boolean
  disabled?: boolean
}>()

const model = defineModel<SourceDraft[]>({ required: true })

const fieldsetId = useId()
const uploading = ref<Record<number, boolean>>({})
const uploadErrors = ref<Record<number, string>>({})

/** Native select instead of BaseSelect: BaseSelect's model is a plain `string`
 * and would widen `draft.type` away from the `SourceType` union. */
const typeOptions: { value: SourceType; label: string }[] = [
  { value: 'LINK', label: 'Enlace' },
  { value: 'YOUTUBE', label: 'Video de YouTube' },
  { value: 'DOCUMENT', label: 'Documento' },
]

function addSource(): void {
  model.value = [...model.value, createSourceDraft()]
}

function removeSource(key: number): void {
  model.value = model.value.filter((draft) => draft.key !== key)
  delete uploadErrors.value[key]
  delete uploading.value[key]
}

function rowError(draft: SourceDraft): string | undefined {
  if (uploadErrors.value[draft.key]) return uploadErrors.value[draft.key]
  if (!props.showErrors) return undefined
  return sourceDraftError(draft) ?? undefined
}

/** Switching away from DOCUMENT drops the upload metadata of the row. The new
 * value is read from the event so it does not depend on listener ordering. */
function onTypeChange(draft: SourceDraft, event: Event): void {
  const target = event.target
  const value = target instanceof HTMLSelectElement ? target.value : draft.type
  if (value !== 'DOCUMENT') {
    draft.fileName = null
    draft.fileSize = null
  }
  uploadErrors.value[draft.key] = ''
}

function previewId(draft: SourceDraft): string | null {
  return draft.type === 'YOUTUBE' && draft.url.trim() !== ''
    ? youtubeVideoId(draft.url.trim())
    : null
}

async function onFileSelected(draft: SourceDraft, event: Event): Promise<void> {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  const file = input.files?.[0]
  if (file === undefined) return

  const clientError = uploadValidationError(file)
  if (clientError !== null) {
    uploadErrors.value[draft.key] = clientError
    input.value = ''
    return
  }

  uploadErrors.value[draft.key] = ''
  uploading.value[draft.key] = true
  try {
    const response = await uploadDocument(file)
    draft.url = absoluteUploadUrl(response.url)
    draft.fileName = response.originalName
    draft.fileSize = response.size
    if (draft.label.trim() === '') draft.label = response.originalName
  } catch (err) {
    uploadErrors.value[draft.key] = errorMessage(err)
  } finally {
    uploading.value[draft.key] = false
    input.value = ''
  }
}

function urlHint(type: SourceType): string {
  if (type === 'YOUTUBE') return 'Pegá el enlace del video (youtube.com/watch?v=… o youtu.be/…).'
  if (type === 'DOCUMENT') return 'Pegá la URL del documento o subí un archivo.'
  return 'Debe empezar con http:// o https://.'
}
</script>

<template>
  <fieldset class="rounded-xl border border-stone-200 p-4 dark:border-stone-700">
    <legend class="px-1 text-sm font-semibold text-stone-800 dark:text-stone-100">
      {{ legend }}
    </legend>
    <p class="mb-3 text-xs text-stone-500 dark:text-stone-400">{{ description }}</p>

    <p
      v-if="showErrors && model.length === 0"
      role="alert"
      class="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
    >
      Agregá al menos una fuente para esta postura.
    </p>

    <ul class="flex flex-col gap-4">
      <li
        v-for="(draft, index) in model"
        :key="draft.key"
        class="rounded-lg border border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-800/50"
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <p class="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Fuente {{ index + 1 }}
          </p>
          <button
            type="button"
            class="rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950/50"
            :disabled="disabled || model.length <= 1"
            :title="model.length <= 1 ? 'Se requiere al menos una fuente' : 'Eliminar esta fuente'"
            @click="removeSource(draft.key)"
          >
            Eliminar
          </button>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <BaseField v-slot="{ id, describedBy }" label="Tipo" required>
            <select
              :id="id"
              v-model="draft.type"
              :disabled="disabled"
              :aria-describedby="describedBy"
              class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 hover:border-stone-400 disabled:cursor-not-allowed disabled:bg-stone-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:border-stone-500 dark:disabled:bg-stone-900"
              @change="onTypeChange(draft, $event)"
            >
              <option v-for="option in typeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </BaseField>
          <BaseInput
            v-model="draft.label"
            label="Etiqueta (opcional)"
            placeholder="Ej. Informe del Banco Central"
            :disabled="disabled"
          />
        </div>

        <div class="mt-3">
          <BaseInput
            v-model="draft.url"
            label="URL"
            type="url"
            required
            :hint="urlHint(draft.type)"
            :error="rowError(draft)"
            :disabled="disabled || uploading[draft.key] === true"
            placeholder="https://…"
          />
        </div>

        <div v-if="draft.type === 'DOCUMENT'" class="mt-3">
          <label
            class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-100 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-amber-600 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
            :for="`${fieldsetId}-file-${draft.key}`"
          >
            <LoadingSpinner v-if="uploading[draft.key]" class="size-4" />
            <span>{{ uploading[draft.key] ? 'Subiendo…' : 'Subir documento' }}</span>
          </label>
          <input
            :id="`${fieldsetId}-file-${draft.key}`"
            type="file"
            class="sr-only"
            :accept="UPLOAD_ACCEPT"
            :disabled="disabled || uploading[draft.key] === true"
            @change="onFileSelected(draft, $event)"
          />
          <p class="mt-1 text-xs text-stone-500 dark:text-stone-400">
            PDF, DOC, DOCX o TXT · máximo 20 MB.
          </p>
          <p
            v-if="draft.fileName !== null"
            class="mt-1 text-xs text-stone-600 dark:text-stone-300"
            role="status"
          >
            Archivo subido: <strong>{{ draft.fileName }}</strong>
            <span v-if="draft.fileSize !== null"> ({{ formatFileSize(draft.fileSize) }})</span>
          </p>
        </div>

        <div v-if="previewId(draft) !== null" class="mt-3 overflow-hidden rounded-lg">
          <p class="mb-1 text-xs text-stone-500 dark:text-stone-400">Vista previa del video</p>
          <iframe
            :src="youtubeEmbedUrl(previewId(draft) ?? '')"
            :title="`Vista previa: ${draft.label.trim() === '' ? draft.url : draft.label}`"
            class="aspect-video w-full border-0"
            loading="lazy"
            allowfullscreen
          ></iframe>
        </div>
        <p
          v-else-if="draft.type === 'YOUTUBE' && draft.url.trim() !== ''"
          class="mt-2 text-xs text-stone-500 dark:text-stone-400"
        >
          No se pudo reconocer un video de YouTube en esa URL; se mostrará como enlace normal.
        </p>
      </li>
    </ul>

    <div class="mt-4">
      <BaseButton variant="secondary" :disabled="disabled" @click="addSource">
        + Agregar fuente
      </BaseButton>
    </div>
  </fieldset>
</template>
