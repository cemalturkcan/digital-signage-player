import process from 'node:process'
import { createApp } from './app/server/create-app.js'
import './app/mqtt/service.js'
import './app/command-processor/service.js'

async function main(): Promise<void> {
  createApp()

  console.log('Not implemented: main server startup')
  throw new Error('Not implemented: main')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
