import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import { createApp } from 'vue'
import App from '@/App.vue'
import { bootstrap } from '@/app/bootstrap/bootstrap'
import { i18n, translate } from '@/app/modules/i18n'
import { disposePlayerRuntime, initializePlayerRuntime } from '@/app/runtime/runtime'
import { useGlobalStore } from '@/app/stores/global/store'
import router from '@/router'
import '@unocss/reset/tailwind.css'
import '@/styles/style.css'

async function main(): Promise<void> {
  const app = createApp(App)
  const pinia = createPinia()
  pinia.use(piniaPluginPersistedstate)
  app.use(pinia)
  app.use(i18n)
  app.use(router)

  const globalStore = useGlobalStore()
  globalStore.showLoading(translate('initializing'))

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
            globalStore.showLoading(translate('registeringDevice'))
            break
          case 'connecting_mqtt':
            globalStore.showLoading(translate('connectingMqtt'))
            break
          case 'connected':
            globalStore.hideLoading()
            break
          case 'error':
            globalStore.showLoading(translate('offlineMode'))
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
    globalStore.showError(
      error instanceof Error ? error.message : translate('initializationFailed'),
    )
  }
}

main().catch((err) => {
  console.error('Fatal error during initialization:', err)
})
