import { customRef, onBeforeUnmount, type Ref } from 'vue'

/** Ref whose writes propagate after `delayMs` of inactivity (search debounce). */
export function useDebouncedRef(initial: string, delayMs = 300): Ref<string> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  onBeforeUnmount(() => clearTimeout(timeout))
  return customRef<string>((track, trigger) => {
    let value = initial
    return {
      get() {
        track()
        return value
      },
      set(newValue: string) {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          value = newValue
          trigger()
        }, delayMs)
      },
    }
  })
}
