import type { Source, SourceType } from '@/types/api'

export interface SourceDraft {
  /** Local-only key: keeps `v-for` stable while rows are added or removed. */
  key: number
  type: SourceType
  url: string
  label: string
  fileName: string | null
  fileSize: number | null
}

export interface SourceDraftData {
  type: SourceType
  url: string
  label: string
  fileName?: string | null
  fileSize?: number | null
}

export function isSourceType(value: unknown): value is SourceType {
  return value === 'LINK' || value === 'YOUTUBE' || value === 'DOCUMENT'
}

/** Runtime guard for data coming back from localStorage (never trusted). */
export function isSourceDraftData(value: unknown): value is SourceDraftData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    isSourceType(value.type) &&
    'url' in value &&
    typeof value.url === 'string' &&
    'label' in value &&
    typeof value.label === 'string'
  )
}

let nextKey = 1

export function createSourceDraft(init: Partial<SourceDraftData> = {}): SourceDraft {
  return {
    key: nextKey++,
    type: init.type ?? 'LINK',
    url: init.url ?? '',
    label: init.label ?? '',
    fileName: init.fileName ?? null,
    fileSize: init.fileSize ?? null,
  }
}

export function draftFromSource(source: Source): SourceDraft {
  return createSourceDraft({ type: source.type, url: source.url, label: source.label ?? '' })
}

export function toDraftData(draft: SourceDraft): SourceDraftData {
  return {
    type: draft.type,
    url: draft.url,
    label: draft.label,
    fileName: draft.fileName,
    fileSize: draft.fileSize,
  }
}

export const MAX_LABEL_LENGTH = 120

/** The API validates source URLs with `z.string().url()`, so relative paths
 * (including `/uploads/...` returned by the upload endpoint) are rejected —
 * uploaded documents must be stored as absolute URLs. */
export function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function sourceDraftError(draft: SourceDraft): string | null {
  const url = draft.url.trim()
  if (url === '') return 'La URL es obligatoria.'
  if (!isValidUrl(url)) return 'Ingresá una URL válida que empiece con http:// o https://.'
  if (draft.label.trim().length > MAX_LABEL_LENGTH) {
    return `La etiqueta no puede superar ${MAX_LABEL_LENGTH} caracteres.`
  }
  return null
}

export function hasSourceErrors(drafts: SourceDraft[]): boolean {
  return drafts.length === 0 || drafts.some((draft) => sourceDraftError(draft) !== null)
}

/** Upload limits enforced by the API (multer): PDF/DOC/DOCX/TXT, max 20 MB. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

export const ALLOWED_UPLOAD_TYPES: readonly string[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]

export const UPLOAD_ACCEPT = '.pdf,.doc,.docx,.txt'

export function uploadValidationError(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'El archivo supera el límite de 20 MB.'
  }
  // Some browsers report an empty MIME type for .doc/.docx; fall back to the
  // extension so a valid file is not rejected client-side.
  const byExtension = /\.(pdf|doc|docx|txt)$/i.test(file.name)
  if (file.type !== '' && !ALLOWED_UPLOAD_TYPES.includes(file.type) && !byExtension) {
    return 'Formato no permitido. Solo se aceptan PDF, DOC, DOCX o TXT.'
  }
  if (file.type === '' && !byExtension) {
    return 'Formato no permitido. Solo se aceptan PDF, DOC, DOCX o TXT.'
  }
  return null
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
