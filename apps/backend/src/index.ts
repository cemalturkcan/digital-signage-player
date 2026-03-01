import process from 'node:process'
import { serve } from '@hono/node-server'
import { connectDb } from '@/app/db/db.js'
import { migration } from '@/app/db/migrate.js'
import { logger } from '@/app/logger/logger.js'
import { messageBusService } from '@/app/message-bus/service.js'
import { createApp } from '@/app/server/create-app.js'
import { HOST, PORT } from '@/config.js'
import '@/app/command-processor/service.js'

async function main(): Promise<void> {
  logger.info('Starting application')

  await connectDb()
  await messageBusService.connect()
  await migration.migrate()

  const app = await createApp()

  serve(
    {
      fetch: app.fetch,
      hostname: HOST,
      port: PORT,
    },
    (info) => {
      const displayHost
        = info.address === '0.0.0.0' || info.address === '::' ? 'localhost' : info.address
      logger.info(`Server: http://${displayHost}:${info.port}`)
    },
  )
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal error during startup')
  process.exit(1)
})
