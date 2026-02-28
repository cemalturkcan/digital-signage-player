#!/usr/bin/env tsx
import * as path from 'node:path'
import * as process from 'node:process'
import {
  ensureCommand,
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

  ensureCommand('tizen', '\'tizen\' command not found in PATH. Add Tizen CLI to your PATH and retry.')
  const sdbCommand = resolveSdbCommand()

  const inputWgtPath = process.argv[2]
  const wgtPath = resolveWgtInput(rootDir, inputWgtPath)

  console.log(`Installing WGT: ${wgtPath}`)
  const targetSerial = waitForTargetSerial(sdbCommand)
  console.log(`Target serial: ${targetSerial}`)

  execInherit('tizen', ['install', '-n', wgtPath, '-s', targetSerial])
  console.log('Install completed')
}

try {
  main()
}
catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`ERROR: ${message}`)
  process.exit(1)
}
