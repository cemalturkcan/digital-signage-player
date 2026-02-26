import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from '@/App.vue'

async function main(): Promise<void> {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.mount('#app')
}

main().catch((err) => {
  console.error('Fatal error during initialization:', err)
})
