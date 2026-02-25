import process from 'node:process'
import type { ServerConfig as _ServerConfig } from '@signage/config'
import { createApp } from './core/app.js'

export type { _ServerConfig }

async function main(): Promise<void> {
  createApp()

  console.log('Not implemented: main server startup')
  throw new Error('Not implemented: main')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
