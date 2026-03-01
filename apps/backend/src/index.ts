import process from 'node:process'
import { serve } from '@hono/node-server'
import { connectDb, db } from '@/app/db/db.js'
import { migration } from '@/app/db/migrate.js'
import { logger } from '@/app/logger/logger.js'
import { messageBusService } from '@/app/message-bus/service.js'
import { createApp } from '@/app/server/create-app.js'
import { HOST, PORT } from '@/config.js'
import '@/app/command-processor/service.js'

const STARTUP_TIMEOUT_MS = 30_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
  )
  return Promise.race([promise, timeout])
}

async function main(): Promise<void> {
  logger.info('Starting application')

  await connectDb()
  await withTimeout(messageBusService.connect(), STARTUP_TIMEOUT_MS, 'Message bus connect')
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

async function shutdown(): Promise<void> {
  logger.info('Shutting down')
  await messageBusService.disconnect()
  await db.end()
  process.exit(0)
}

process.once('SIGTERM', () => void shutdown())
process.once('SIGINT', () => void shutdown())
