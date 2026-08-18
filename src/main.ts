import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { configureHttp } from './lib/http'
import { useAuthStore } from './stores/auth'
import { useConnectionStore } from './stores/connection'
import './assets/main.css'

const app = createApp(App)
app.use(createPinia())

// Wire the HTTP layer to the stores after Pinia is active (avoids circular
// imports between lib/http and the stores).
const auth = useAuthStore()
const connection = useConnectionStore()
configureHttp({
  getToken: () => auth.token,
  handleUnauthorized: () => auth.handleUnauthorized(),
  handleNetworkFailure: () => connection.reportApiFailure(),
  handleNetworkSuccess: () => connection.reportApiSuccess(),
})

app.use(router)
app.mount('#app')
