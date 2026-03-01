import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import { createApp } from 'vue'
import App from '@/App.vue'
import { bootstrap } from '@/app/bootstrap/bootstrap'
import { disposePlayerRuntime, initializePlayerRuntime } from '@/app/runtime/runtime'
import { useGlobalStore } from '@/app/stores/global/store'
import '@unocss/reset/tailwind.css'
import '@/styles/style.css'

async function main(): Promise<void> {
  const app = createApp(App)
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  app.use(pinia)

  const globalStore = useGlobalStore()
  globalStore.showLoading('Initializing...')

  app.mount('#app')

  window.addEventListener('beforeunload', () => {
    disposePlayerRuntime()
  })

  try {
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
            globalStore.showLoading('Offline mode...')
            break
        }
      },
      onError: (error) => {
        globalStore.setStatus(error.message)
      },
    })

    await initializePlayerRuntime(result)
  }
  catch (error) {
    globalStore.showError(error instanceof Error ? error.message : 'Initialization failed')
  }
}

main().catch((err) => {
  console.error('Fatal error during initialization:', err)
})
