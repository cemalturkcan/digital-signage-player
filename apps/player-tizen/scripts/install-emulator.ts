#!/usr/bin/env tsx
import * as path from 'node:path'
import * as process from 'node:process'
import {
  execCapture,
  execInherit,
  getAppPackageId,
  loadDotEnvFile,
  resolveSdbCommand,
  resolveWgtInput,
  rootDir,
  waitForTargetSerial,
} from './tizen-common'

function installWithSdb(sdbCommand: string, targetSerial: string, wgtPath: string): string {
  const installOutput = execCapture(sdbCommand, ['-s', targetSerial, 'install', wgtPath])
  console.log(installOutput.trim())

  if (!installOutput.includes('key[end] val[ok]')) {
    throw new Error(installOutput)
  }

  return installOutput
}

function main(): void {
  const envFilePath = path.join(rootDir, '.env.tizen')
  loadDotEnvFile(envFilePath)

  const sdbCommand = resolveSdbCommand()

  const inputWgtPath = process.argv[2]
  const wgtPath = resolveWgtInput(rootDir, inputWgtPath)
  const packageId = process.env.APP_PACKAGE_ID || getAppPackageId(path.join(rootDir, 'config.xml'))

  console.log(`Installing WGT: ${wgtPath}`)
  const targetSerial = waitForTargetSerial(sdbCommand)
  console.log(`Target serial: ${targetSerial}`)

  try {
    execInherit(sdbCommand, ['-s', targetSerial, 'uninstall', packageId])
  }
  catch {
    // Ignore uninstall errors (package may not be installed yet).
  }

  try {
    installWithSdb(sdbCommand, targetSerial, wgtPath)
  }
  catch (error) {
    const output = error instanceof Error ? error.message : String(error)
    const shouldRetry = output.includes('error] val[-12]')

    if (!shouldRetry) {
      throw new Error('Install failed (sdb did not report success).')
    }

    console.log('Install reported certificate/signature validation error. Retrying once...')
    try {
      installWithSdb(sdbCommand, targetSerial, wgtPath)
    }
    catch (retryError) {
      const retryOutput = retryError instanceof Error ? retryError.message : String(retryError)
      const shouldRebuild = retryOutput.includes('error] val[-12]')
      if (!shouldRebuild) {
        throw new Error('Install failed (sdb did not report success).')
      }

      console.log(
        'Install still failed after retry. Rebuilding package once and retrying install...',
      )
      execInherit('pnpm', ['run', 'build'])
      installWithSdb(sdbCommand, targetSerial, wgtPath)
    }
  }

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
