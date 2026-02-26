import process from 'node:process'
import { serve } from '@hono/node-server'
import { createApp } from '@/app/server/create-app.js'
import '@/app/mqtt/service.js'
import '@/app/command-processor/service.js'
import { HOST, NODE_ENV, PORT } from '@/config.js'

async function main(): Promise<void> {
  const app = await createApp()

  serve(
    {
      fetch: app.fetch,
      hostname: HOST,
      port: PORT,
    },
    (info) => {
      console.log(`Server running: NODE_ENV=${NODE_ENV}, HOST=${info.address}, PORT=${info.port}`)
    },
  )
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
