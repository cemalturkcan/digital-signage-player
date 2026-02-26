import process from 'node:process'
import { serve } from '@hono/node-server'
import { createApp } from '@/app/server/create-app.js'
import { migration } from '@/db/migrate.js'
import { connectDb } from '@/db/db.js'
import { connectMqtt } from '@/app/mqtt/base-service.js'
import '@/app/command-processor/service.js'
import { HOST, PORT } from '@/config.js'
import { logger } from '@/app/logger/logger.js'

async function main(): Promise<void> {
  logger.info('Starting application')

  await connectDb()
  await connectMqtt()
  await migration.migrate()

  const app = await createApp()

  serve(
    {
      fetch: app.fetch,
      hostname: HOST,
      port: PORT,
    },
    (info) => {
      const displayHost =
        info.address === '0.0.0.0' || info.address === '::' ? 'localhost' : info.address
      logger.info(`Server: http://${displayHost}:${info.port}`)
    }
  )
}

main().catch((err) => {
  logger.fatal({ err }, 'Fatal error during startup')
  process.exit(1)
})
