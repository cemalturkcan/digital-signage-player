#!/usr/bin/env tsx
import * as path from 'node:path'
import * as process from 'node:process'
import {
  execCapture,
  getAppId,
  loadDotEnvFile,
  resolveSdbCommand,
  rootDir,
  waitForTargetSerial,
} from './tizen-common'

function main(): void {
  const envFilePath = path.join(rootDir, '.env.tizen')
  loadDotEnvFile(envFilePath)

  const sdbCommand = resolveSdbCommand()

  const configuredAppId = process.env.APP_ID || process.env.APP_PACKAGE_ID || ''
  const appId = configuredAppId.includes('.')
    ? configuredAppId
    : getAppId(path.join(rootDir, 'config.xml'))
  const targetSerial = waitForTargetSerial(sdbCommand)

  console.log(`Running app ${appId} on target ${targetSerial}`)
  const runOutput = execCapture(sdbCommand, [
    '-s',
    targetSerial,
    'shell',
    'app_launcher',
    '-s',
    appId,
  ])
  console.log(runOutput.trim())

  if (!runOutput.includes('successfully launched')) {
    throw new Error('Run failed (app_launcher did not report successful launch).')
  }
}

try {
  main()
}
catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`ERROR: ${message}`)
  process.exit(1)
}
