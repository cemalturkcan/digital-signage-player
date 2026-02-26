import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from '@/App.vue'
import { bootstrap } from '@/app/bootstrap/bootstrap'
import { useGlobalStore } from '@/app/stores/global/store'

async function main(): Promise<void> {
  const app = createApp(App)
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  app.use(pinia)

  const globalStore = useGlobalStore()
  globalStore.showLoading('Initializing...')

  const result = await bootstrap({
    onStateChange: (state) => {
      globalStore.setStatus(state)
      switch (state) {
        case 'registering':
          globalStore.showLoading('Registering device...')
          break
        case 'connecting_mqtt':
          globalStore.showLoading('Connecting to MQTT...')
          break
        case 'connected':
          globalStore.hideLoading()
          break
        case 'error':
          globalStore.showError('Failed to initialize')
          break
      }
    },
    onError: (error) => {
      globalStore.showError(error.message)
    },
  })

  if (result.state === 'error') {
    globalStore.showError('Bootstrap failed')
  }

  app.provide('bootstrapResult', result)
  app.mount('#app')
}

main().catch((err) => {
  console.error('Fatal error during initialization:', err)
})
