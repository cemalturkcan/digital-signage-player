#!/usr/bin/env tsx
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as process from 'node:process'
import {
  distDir,
  ensureCommand,
  execCapture,
  execInherit,
  formatBytes,
  getPackageJsonVersion,
  loadDotEnvFile,
  rootDir,
  updateWidgetVersion,
} from './tizen-common'

const envFilePath = path.join(rootDir, '.env.tizen')
const packageJsonPath = path.join(rootDir, 'package.json')
const configXmlPath = path.join(rootDir, 'config.xml')

function profileExists(profileName: string): boolean {
  const output = execCapture('tizen', ['security-profiles', 'list'])
  return output.includes(profileName)
}

function resolveAuthorCertPath(profileName: string, configuredPath: string): string {
  if (configuredPath) {
    const absoluteConfigured = path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(rootDir, configuredPath)
    if (fs.existsSync(absoluteConfigured)) {
      return absoluteConfigured
    }
  }

  const rootCert = path.join(rootDir, `${profileName}.p12`)
  if (fs.existsSync(rootCert)) {
    return rootCert
  }

  const homeCert = path.join(process.env.HOME ?? process.env.USERPROFILE ?? '', 'tizen-studio-data', 'keystore', 'author', `${profileName}.p12`)
  if (fs.existsSync(homeCert)) {
    return homeCert
  }

  return ''
}

function ensureSigningProfile(profileName: string, authorName: string, authorPassword: string, configuredAuthorCertPath: string): void {
  if (profileExists(profileName)) {
    console.log(`Profile exists: ${profileName}`)
    return
  }

  console.log(`Creating certificate and profile: ${profileName}`)

  let authorCertPath = resolveAuthorCertPath(profileName, configuredAuthorCertPath)
  if (!authorCertPath) {
    execInherit('tizen', ['certificate', '-a', authorName, '-p', authorPassword, '-f', profileName])
    authorCertPath = resolveAuthorCertPath(profileName, configuredAuthorCertPath)
  }

  if (!authorCertPath) {
    throw new Error(`Could not find author certificate file for profile ${profileName}`)
  }

  try {
    execInherit('tizen', [
      'security-profiles',
      'add',
      '-n',
      profileName,
      '-a',
      authorCertPath,
      '-p',
      authorPassword,
    ])
  }
  catch {
    if (!profileExists(profileName)) {
      throw new Error(`Could not create security profile: ${profileName}`)
    }
  }

  console.log(`Profile created: ${profileName}`)
}

function packageWgt(profileName: string, version: string): void {
  if (!fs.existsSync(configXmlPath)) {
    throw new Error('config.xml not found')
  }

  if (!fs.existsSync(distDir)) {
    throw new Error('dist/ not found. Run \'vite build --mode tizen\' first.')
  }

  console.log('Copying config.xml to dist/')
  fs.copyFileSync(configXmlPath, path.join(distDir, 'config.xml'))

  console.log(`Packaging WGT with profile: ${profileName}`)
  execInherit('tizen', ['package', '-t', 'wgt', '-s', profileName, '--', distDir])

  const wgtFiles = fs.readdirSync(distDir).filter(name => name.endsWith('.wgt'))
  if (wgtFiles.length === 0) {
    throw new Error('WGT file not found after packaging')
  }

  const sourcePath = path.join(distDir, wgtFiles[0])
  const outputName = `digital_signage_player_${version}.wgt`
  const outputPath = path.join(rootDir, outputName)

  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath)
  }

  fs.renameSync(sourcePath, outputPath)
  const size = formatBytes(fs.statSync(outputPath).size)
  console.log(`WGT created: ${outputPath} (${size})`)
}

function main(): void {
  loadDotEnvFile(envFilePath)

  ensureCommand('tizen', '\'tizen\' command not found in PATH. Add Tizen CLI to your PATH and retry.')
  ensureCommand('npx', '\'npx\' command not found in PATH.')

  const profileName = process.env.TIZEN_PROFILE || 'SignageProfile'
  const authorPassword = process.env.TIZEN_AUTHOR_CERT_PASSWORD || 'signage1234'
  const authorName = process.env.TIZEN_AUTHOR_CERT_NAME || 'SignageAuthor'
  const authorCertPath = process.env.TIZEN_AUTHOR_CERT_PATH || ''

  const version = getPackageJsonVersion(packageJsonPath)
  console.log('Tizen CLI: tizen (PATH)')
  console.log(`Version: ${version}`)

  updateWidgetVersion(configXmlPath, version)

  console.log('Building for Tizen...')
  execInherit('npx', ['vite', 'build', '--mode', 'tizen'])

  ensureSigningProfile(profileName, authorName, authorPassword, authorCertPath)
  packageWgt(profileName, version)
}

try {
  main()
}
catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`ERROR: ${message}`)
  process.exit(1)
}
