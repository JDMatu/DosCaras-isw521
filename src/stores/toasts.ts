import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastKind = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

/** Errors stay at least 4s, success 2-3s; stack is bounded. */
const DURATION_MS: Record<ToastKind, number> = {
  success: 2500,
  info: 3500,
  warning: 5000,
  error: 6000,
}

const MAX_VISIBLE = 5

let nextId = 1

export const useToastsStore = defineStore('toasts', () => {
  const toasts = ref<Toast[]>([])

  function push(kind: ToastKind, message: string): void {
    const id = nextId++
    toasts.value.push({ id, kind, message })
    if (toasts.value.length > MAX_VISIBLE) {
      toasts.value = toasts.value.slice(-MAX_VISIBLE)
    }
    setTimeout(() => dismiss(id), DURATION_MS[kind])
  }

  function dismiss(id: number): void {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return {
    toasts,
    dismiss,
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    warning: (message: string) => push('warning', message),
    info: (message: string) => push('info', message),
  }
})
