import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import { createApp } from 'vue'
import App from '@/App.vue'
import { bootstrap } from '@/app/bootstrap/bootstrap'
import { i18n, translate } from '@/app/modules/i18n'
import { useDevicesStore } from '@/app/stores/devices/store'
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
    useDevicesStore().stopPolling()
  })

  try {
    await bootstrap({
      onStateChange: (state) => {
        globalStore.setStatus(state)
        switch (state) {
          case 'starting':
            globalStore.showLoading(translate('loadingDevices'))
            break
          case 'ready':
            globalStore.hideLoading()
            break
          case 'error':
            globalStore.showError(translate('activeDevicesUnavailable'))
            break
        }
      },
      onError: (error) => {
        globalStore.showError(error.message)
      },
    })
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
