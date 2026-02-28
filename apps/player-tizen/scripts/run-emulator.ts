#!/usr/bin/env tsx
import * as path from 'node:path'
import * as process from 'node:process'
import {
  ensureCommand,
  execInherit,
  getAppPackageId,
  loadDotEnvFile,
  resolveSdbCommand,
  rootDir,
  waitForTargetSerial,
} from './tizen-common'

function main(): void {
  const envFilePath = path.join(rootDir, '.env.tizen')
  loadDotEnvFile(envFilePath)

  ensureCommand('tizen', '\'tizen\' command not found in PATH. Add Tizen CLI to your PATH and retry.')
  const sdbCommand = resolveSdbCommand()

  const packageId = process.env.APP_PACKAGE_ID || getAppPackageId(path.join(rootDir, 'config.xml'))
  const targetSerial = waitForTargetSerial(sdbCommand)

  console.log(`Running package ${packageId} on target ${targetSerial}`)
  execInherit('tizen', ['run', '-p', packageId, '-s', targetSerial])
}

try {
  main()
}
catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`ERROR: ${message}`)
  process.exit(1)
}
