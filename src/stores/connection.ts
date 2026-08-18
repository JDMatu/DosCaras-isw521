import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useConnectionStore = defineStore('connection', () => {
  const browserOnline = ref(navigator.onLine)
  const apiReachable = ref(true)
  const becameOnline = ref(0)

  window.addEventListener('online', () => {
    browserOnline.value = true
    apiReachable.value = true
    becameOnline.value++
  })
  window.addEventListener('offline', () => {
    browserOnline.value = false
  })

  function reportApiFailure(): void {
    apiReachable.value = false
  }

  function reportApiSuccess(): void {
    if (!apiReachable.value) {
      apiReachable.value = true
      becameOnline.value++
    }
  }

  return { browserOnline, apiReachable, becameOnline, reportApiFailure, reportApiSuccess }
})
