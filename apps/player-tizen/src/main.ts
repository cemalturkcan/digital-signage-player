import { createApp } from 'vue'
import App from './App.vue'
import './infrastructure/mqtt/client.js'
import './application/storage/service.js'
import './app/platform/factory.js'
import './application/playlist/service.js'
import './application/player/service.js'
import './application/commands/bus.js'
import './application/view/manager.js'

async function main(): Promise<void> {
  const app = createApp(App)
  app.mount('#app')
}

main().catch((err) => {
  console.error('Fatal error during initialization:', err)
})
