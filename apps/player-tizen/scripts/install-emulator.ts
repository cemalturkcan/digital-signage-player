#!/usr/bin/env tsx
import * as path from 'node:path'
import * as process from 'node:process'
import {
  execInherit,
  loadDotEnvFile,
  resolveSdbCommand,
  resolveWgtInput,
  rootDir,
  waitForTargetSerial,
} from './tizen-common'

function main(): void {
  const envFilePath = path.join(rootDir, '.env.tizen')
  loadDotEnvFile(envFilePath)

  const sdbCommand = resolveSdbCommand()

  const inputWgtPath = process.argv[2]
  const wgtPath = resolveWgtInput(rootDir, inputWgtPath)

  console.log(`Installing WGT: ${wgtPath}`)
  const targetSerial = waitForTargetSerial(sdbCommand)
  console.log(`Target serial: ${targetSerial}`)

  execInherit(sdbCommand, ['-s', targetSerial, 'install', wgtPath])
  console.log('Install completed')
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`ERROR: ${message}`)
  process.exit(1)
}
