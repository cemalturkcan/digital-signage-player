#!/usr/bin/env tsx
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import * as process from 'node:process'
import {
  commandExists,
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

interface DistributorSigningInfo {
  certPath: string
  caPath: string
  password: string
}

function resolveProfilesPath(): string {
  try {
    const output = execCapture('tizen', ['cli-config', '-l'])
    for (const rawLine of output.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line.startsWith('default.profiles.path=')) {
        continue
      }

      const profilesPath = line.slice('default.profiles.path='.length).trim()
      if (profilesPath) {
        return profilesPath
      }
    }
  }
  catch {}

  const homeDir = process.env.USERPROFILE ?? process.env.HOME ?? os.homedir()
  return path.join(homeDir, 'tizen-studio-data', 'profile', 'profiles.xml')
}

function resolveTizenDataDir(profilesPath: string): string {
  if (profilesPath) {
    const profileDir = path.dirname(profilesPath)
    const dataDir = path.dirname(profileDir)
    const root = path.parse(dataDir).root
    if (dataDir && dataDir !== root) {
      return dataDir
    }
  }

  const homeDir = process.env.USERPROFILE ?? process.env.HOME ?? os.homedir()
  return path.join(homeDir, 'tizen-studio-data')
}

function configureProfilesPath(profilesPath: string): void {
  execInherit('tizen', ['cli-config', `default.profiles.path=${profilesPath}`])

  try {
    execInherit('tizen', ['cli-config', `profiles.path=${profilesPath}`])
  }
  catch {}
}

function resolveCertificateGeneratorDir(): string {
  const candidates = [
    path.join(process.env.TIZEN_STUDIO_HOME ?? '', 'tools', 'certificate-generator'),
    path.join(process.env.HOME ?? '', 'tizen-studio', 'tools', 'certificate-generator'),
    path.join('C:\\', 'tizen-studio', 'tools', 'certificate-generator'),
    path.join(process.env.USERPROFILE ?? '', 'tizen-studio', 'tools', 'certificate-generator'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error('Could not locate Tizen certificate-generator directory')
}

function resolveAuthorCertPath(
  profileName: string,
  configuredPath: string,
  tizenDataDir: string,
): string {
  const candidates = [
    configuredPath
      ? path.isAbsolute(configuredPath)
        ? configuredPath
        : path.resolve(rootDir, configuredPath)
      : '',
    path.join(rootDir, `${profileName}.p12`),
    path.join(tizenDataDir, 'keystore', 'author', `${profileName}.p12`),
    path.join(tizenDataDir, 'keystore', 'author', 'SignageProfile.p12'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error(
    `Author certificate not found for profile '${profileName}'. Set TIZEN_AUTHOR_CERT_PATH or place p12 under ${path.join(tizenDataDir, 'keystore', 'author')}`,
  )
}

function resolveDistributorSigningInfo(): DistributorSigningInfo {
  const configuredCertPath = process.env.TIZEN_DISTRIBUTOR_CERT_PATH || ''
  const configuredCaPath = process.env.TIZEN_DISTRIBUTOR_CA_PATH || ''
  const configuredPassword = process.env.TIZEN_DISTRIBUTOR_CERT_PASSWORD || ''

  if (configuredCertPath) {
    const certPath = path.isAbsolute(configuredCertPath)
      ? configuredCertPath
      : path.resolve(rootDir, configuredCertPath)
    if (!fs.existsSync(certPath)) {
      throw new Error(`Configured distributor certificate not found: ${certPath}`)
    }

    const caPath = configuredCaPath
      ? path.isAbsolute(configuredCaPath)
        ? configuredCaPath
        : path.resolve(rootDir, configuredCaPath)
      : ''

    if (caPath && !fs.existsSync(caPath)) {
      throw new Error(`Configured distributor CA certificate not found: ${caPath}`)
    }

    return {
      certPath,
      caPath,
      password: configuredPassword || 'tizenpkcs12passfordsigner',
    }
  }

  const certificateGeneratorDir = resolveCertificateGeneratorDir()
  const distributorDir = path.join(certificateGeneratorDir, 'certificates', 'distributor')
  const certCandidates = [
    path.join(distributorDir, 'tizen-distributor-signer.p12'),
    path.join(distributorDir, 'tizen-distributor-signer-new.p12'),
  ]
  const caCandidates = [
    path.join(distributorDir, 'tizen-distributor-ca.cer'),
    path.join(distributorDir, 'tizen-distributor-ca-new.cer'),
  ]

  const certPath = certCandidates.find(candidate => fs.existsSync(candidate)) || ''
  if (!certPath) {
    throw new Error(`Could not locate distributor signer certificate in ${distributorDir}`)
  }

  const caPath = caCandidates.find(candidate => fs.existsSync(candidate)) || ''
  return {
    certPath,
    caPath,
    password: configuredPassword || 'tizenpkcs12passfordsigner',
  }
}

function validatePkcs12Password(certPath: string, password: string, label: string): void {
  if (!commandExists('openssl')) {
    return
  }

  const nullOutput = process.platform === 'win32' ? 'NUL' : '/dev/null'

  try {
    execInherit('openssl', [
      'pkcs12',
      '-legacy',
      '-in',
      certPath,
      '-passin',
      `pass:${password}`,
      '-nokeys',
      '-clcerts',
      '-out',
      nullOutput,
    ])
  }
  catch {
    throw new Error(`Invalid ${label} certificate password for ${certPath}`)
  }
}

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function writeSigningProfileFile(
  profilesPath: string,
  profileName: string,
  authorCertPath: string,
  authorPassword: string,
  distributor: DistributorSigningInfo,
): void {
  const parentDir = path.dirname(profilesPath)
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true })
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    `<profiles active="${xmlEscape(profileName)}" version="3.1">`,
    `  <profile name="${xmlEscape(profileName)}">`,
    `    <profileitem ca="" distributor="0" key="${xmlEscape(authorCertPath)}" password="${xmlEscape(authorPassword)}" rootca=""/>`,
    `    <profileitem ca="${xmlEscape(distributor.caPath)}" distributor="1" key="${xmlEscape(distributor.certPath)}" password="${xmlEscape(distributor.password)}" rootca=""/>`,
    '    <profileitem ca="" distributor="2" key="" password="" rootca=""/>',
    '  </profile>',
    '</profiles>',
    '',
  ].join('\n')

  fs.writeFileSync(profilesPath, xml, 'utf8')
}

function packageWgt(profileName: string, version: string): void {
  if (!fs.existsSync(configXmlPath)) {
    throw new Error('config.xml not found')
  }

  if (!fs.existsSync(distDir)) {
    throw new Error('dist/ not found. Run \'vite build --mode tizen\' first.')
  }

  fs.copyFileSync(configXmlPath, path.join(distDir, 'config.xml'))

  const packageStartMs = Date.now()

  console.log(`Packaging WGT with profile: ${profileName}`)
  execInherit('tizen', ['package', '-t', 'wgt', '-s', profileName, '--', distDir])

  const candidateDirs = [distDir, rootDir]
  const candidates: string[] = []

  for (const candidateDir of candidateDirs) {
    if (!fs.existsSync(candidateDir)) {
      continue
    }

    for (const name of fs.readdirSync(candidateDir)) {
      if (!name.endsWith('.wgt')) {
        continue
      }

      const fullPath = path.join(candidateDir, name)
      const modifiedMs = fs.statSync(fullPath).mtimeMs
      if (modifiedMs >= packageStartMs - 1000) {
        candidates.push(fullPath)
      }
    }
  }

  if (candidates.length === 0) {
    throw new Error('WGT file not found after packaging')
  }

  candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  const sourcePath = candidates[0]
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
  const authorCertPath = process.env.TIZEN_AUTHOR_CERT_PATH || ''

  const profilesPath = resolveProfilesPath()
  const tizenDataDir = resolveTizenDataDir(profilesPath)
  const generatedProfilesPath = path.join(tizenDataDir, 'profile', `profiles-${profileName}.xml`)

  const version = getPackageJsonVersion(packageJsonPath)
  console.log('Tizen CLI: tizen (PATH)')
  console.log(`Version: ${version}`)

  updateWidgetVersion(configXmlPath, version)

  console.log('Building for Tizen...')
  execInherit('npx', ['vite', 'build', '--mode', 'tizen'])

  const resolvedAuthorCertPath = resolveAuthorCertPath(profileName, authorCertPath, tizenDataDir)
  const distributorSigning = resolveDistributorSigningInfo()

  validatePkcs12Password(resolvedAuthorCertPath, authorPassword, 'author')
  validatePkcs12Password(distributorSigning.certPath, distributorSigning.password, 'distributor')

  writeSigningProfileFile(
    generatedProfilesPath,
    profileName,
    resolvedAuthorCertPath,
    authorPassword,
    distributorSigning,
  )

  configureProfilesPath(generatedProfilesPath)

  try {
    packageWgt(profileName, version)
  }
  finally {
    if (generatedProfilesPath !== profilesPath) {
      try {
        configureProfilesPath(profilesPath)
      }
      catch {}

      try {
        if (fs.existsSync(generatedProfilesPath)) {
          fs.unlinkSync(generatedProfilesPath)
        }
      }
      catch {}
    }
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
