import { API_BASE_URL, http } from '@/lib/http'
import type { UploadResponse } from '@/types/api'

/** Allowed by the API: PDF, DOC, DOCX, TXT (by MIME type), max 20MB. */
export function uploadDocument(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)
  return http.post<UploadResponse>('/api/uploads/document', { body: form })
}

/** Upload URLs come back relative (`/uploads/...`); make them absolute. */
export function absoluteUploadUrl(url: string): string {
  return url.startsWith('/') ? `${API_BASE_URL}${url}` : url
}
