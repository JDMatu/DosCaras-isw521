export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface ApiErrorBody {
  error: string
  details?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

/** Thrown when the request never reached the server (API down, DNS, CORS). */
export class NetworkError extends Error {
  constructor() {
    super('No se pudo conectar con el servidor')
    this.name = 'NetworkError'
  }
}

type QueryValue = string | number | boolean | undefined | null

export interface RequestOptions {
  query?: Record<string, QueryValue>
  body?: unknown
  signal?: AbortSignal
}

let tokenProvider: () => string | null = () => null
let onUnauthorized: (() => void) | null = null
let onNetworkFailure: (() => void) | null = null
let onNetworkSuccess: (() => void) | null = null

/** Stores register themselves here to avoid circular imports. */
export function configureHttp(options: {
  getToken: () => string | null
  handleUnauthorized: () => void
  handleNetworkFailure?: () => void
  handleNetworkSuccess?: () => void
}): void {
  tokenProvider = options.getToken
  onUnauthorized = options.handleUnauthorized
  onNetworkFailure = options.handleNetworkFailure ?? null
  onNetworkSuccess = options.handleNetworkSuccess ?? null
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(path, API_BASE_URL)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {}
  const token = tokenProvider()
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (options.body instanceof FormData) {
    body = options.body
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  const fetchData = () =>
    fetch(buildUrl(path, options.query), {
      method,
      headers,
      body,
      signal: options.signal,
    })

  let response: Response
  try {
    response = await fetchData()
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    // Retry failed GETs once on network error before surfacing it.
    if (method === 'GET') {
      try {
        response = await fetchData()
      } catch (retryErr) {
        if (retryErr instanceof DOMException && retryErr.name === 'AbortError') throw retryErr
        onNetworkFailure?.()
        throw new NetworkError()
      }
    } else {
      onNetworkFailure?.()
      throw new NetworkError()
    }
  }
  onNetworkSuccess?.()

  if (response.status === 204) return undefined as T

  let data: unknown = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    const errBody = (data ?? {}) as Partial<ApiErrorBody>
    const apiError = new ApiError(
      response.status,
      errBody.error ?? `Error ${response.status}`,
      errBody.details,
    )
    // Expired/invalid session: notify the auth store, except for login/register
    // themselves where a 401 is a normal wrong-credentials response.
    if (response.status === 401 && token && onUnauthorized) {
      onUnauthorized()
    }
    throw apiError
  }

  return data as T
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, options?: RequestOptions) => request<T>('POST', path, options),
  put: <T>(path: string, options?: RequestOptions) => request<T>('PUT', path, options),
  patch: <T>(path: string, options?: RequestOptions) => request<T>('PATCH', path, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
}

/** Maps any thrown value to a user-facing Spanish message. */
export function errorMessage(err: unknown): string {
  if (err instanceof NetworkError) {
    return 'No se pudo conectar con el servidor. Verificá que el API esté disponible.'
  }
  if (err instanceof ApiError) {
    return translateApiMessage(err.message, err.status)
  }
  return 'Ocurrió un error inesperado.'
}

/**
 * The API returns messages in English; map the known ones to Spanish and fall
 * back to a generic message per status code for unknown ones.
 */
const KNOWN_MESSAGES: Record<string, string> = {
  'Invalid credentials': 'Credenciales inválidas.',
  'Missing bearer token': 'Necesitás iniciar sesión para realizar esta acción.',
  'Invalid or expired token': 'Tu sesión expiró. Iniciá sesión nuevamente.',
  'Insufficient permissions': 'No tenés permisos para realizar esta acción.',
  'Record not found': 'El recurso solicitado no existe.',
  'A record with these unique fields already exists': 'Ya existe un registro con esos datos.',
  'Internal server error': 'Error interno del servidor. Intentá de nuevo más tarde.',
  'Validation failed': 'Los datos enviados no son válidos.',
  'Invalid email or password': 'Correo o contraseña incorrectos.',
  'Email is already registered': 'El correo ya está registrado.',
  'Account is pending activation': 'Tu cuenta todavía no está activada.',
  'Account is suspended': 'Tu cuenta está suspendida. Contactá a un administrador.',
  'Invalid activation token': 'El enlace de activación no es válido o ya fue utilizado.',
  'Political view not found': 'Esta publicación no existe o fue eliminada.',
  'Category not found': 'La categoría no existe o fue eliminada.',
  'Category does not exist': 'La categoría seleccionada no existe.',
  'Only the author or a superadmin can edit this view':
    'Solo el autor o un administrador pueden editar esta publicación.',
  'Unsupported file type. Allowed: PDF, DOC, DOCX, TXT':
    'Tipo de archivo no permitido. Se aceptan PDF, DOC, DOCX y TXT.',
  'parentId must reference a comment in the same thread':
    'La respuesta debe referirse a un comentario del mismo hilo.',
}

function translateApiMessage(message: string, status: number): string {
  if (KNOWN_MESSAGES[message]) return KNOWN_MESSAGES[message]
  switch (status) {
    case 400:
      return `Solicitud inválida: ${message}`
    case 401:
      return 'Necesitás iniciar sesión para realizar esta acción.'
    case 403:
      return 'No tenés permisos para realizar esta acción.'
    case 404:
      return 'El recurso solicitado no existe.'
    case 409:
      return `Conflicto: ${message}`
    default:
      return message
  }
}
