#!/usr/bin/env tsx
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import * as process from 'node:process'
import { createInterface } from 'node:readline'
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

function isTruthyEnv(value: string | undefined): boolean {
  if (!value)
    return false
  const normalized = value.toLowerCase().trim()
  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

function isCiEnvironment(): boolean {
  return (
    process.env.GITHUB_ACTIONS === 'true' || isTruthyEnv(process.env.CI) || !process.stdin.isTTY
  )
}

async function promptYesNo(question: string, defaultValue: boolean): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const defaultStr = defaultValue ? 'Y/n' : 'y/N'
  const prompt = `${question} [${defaultStr}]: `

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close()
      const trimmed = answer.trim().toLowerCase()
      if (trimmed === '') {
        resolve(defaultValue)
      }
      else if (['y', 'yes'].includes(trimmed)) {
        resolve(true)
      }
      else if (['n', 'no'].includes(trimmed)) {
        resolve(false)
      }
      else {
        resolve(defaultValue)
      }
    })
  })
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
  const normalizedProfilesPath
    = process.platform === 'win32' ? profilesPath.replaceAll('\\', '/') : profilesPath
  const defaultProfilesConfig
    = process.platform === 'win32'
      ? `"default.profiles.path=${normalizedProfilesPath}"`
      : `default.profiles.path=${normalizedProfilesPath}`
  execInherit('tizen', ['cli-config', defaultProfilesConfig])

  try {
    const profilesConfig
      = process.platform === 'win32'
        ? `"profiles.path=${normalizedProfilesPath}"`
        : `profiles.path=${normalizedProfilesPath}`
    execInherit('tizen', ['cli-config', profilesConfig])
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

function resolveAuthorCertTargetPath(
  profileName: string,
  configuredPath: string,
  tizenDataDir: string,
): string {
  if (configuredPath) {
    return path.isAbsolute(configuredPath) ? configuredPath : path.resolve(rootDir, configuredPath)
  }
  return path.join(tizenDataDir, 'keystore', 'author', `${profileName}.p12`)
}

function createAuthorCertificate(profileName: string, targetPath: string, password: string): void {
  const outputDir = path.dirname(targetPath)
  const cliOutputDir = process.platform === 'win32' ? outputDir.replaceAll('\\', '/') : outputDir
  const outputName = path.basename(targetPath, path.extname(targetPath))

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const country = process.env.TIZEN_AUTHOR_CERT_COUNTRY || 'US'
  const state = process.env.TIZEN_AUTHOR_CERT_STATE || 'CA'
  const city = process.env.TIZEN_AUTHOR_CERT_CITY || 'SanJose'
  const org = process.env.TIZEN_AUTHOR_CERT_ORG || 'DigitalSignage'
  const unit = process.env.TIZEN_AUTHOR_CERT_UNIT || 'Player'
  const name = process.env.TIZEN_AUTHOR_CERT_NAME || profileName
  const email = process.env.TIZEN_AUTHOR_CERT_EMAIL || 'dev@example.com'

  const argsWithWorkingDir = [
    'certificate',
    '-a',
    profileName,
    '-p',
    password,
    '-c',
    country,
    '-s',
    state,
    '-ct',
    city,
    '-o',
    org,
    '-u',
    unit,
    '-n',
    name,
    '-e',
    email,
    '-f',
    outputName,
    '--',
    cliOutputDir,
  ]

  try {
    const output = execCapture('tizen', argsWithWorkingDir)
    if (output.trim()) {
      console.log(output.trim())
    }
  }
  catch (firstError) {
    const argsWithoutWorkingDir = [
      'certificate',
      '-a',
      profileName,
      '-p',
      password,
      '-c',
      country,
      '-s',
      state,
      '-ct',
      city,
      '-o',
      org,
      '-u',
      unit,
      '-n',
      name,
      '-e',
      email,
      '-f',
      outputName,
    ]

    try {
      const output = execCapture('tizen', argsWithoutWorkingDir, { cwd: outputDir })
      if (output.trim()) {
        console.log(output.trim())
      }
    }
    catch (secondError) {
      const firstMessage = firstError instanceof Error ? firstError.message : String(firstError)
      const secondMessage = secondError instanceof Error ? secondError.message : String(secondError)
      throw new Error(
        `Author certificate creation failed. First attempt (with -- output dir): ${firstMessage}. Fallback attempt (cwd=output dir): ${secondMessage}`,
      )
    }
  }

  if (!fs.existsSync(targetPath)) {
    throw new Error(`Certificate creation failed: file not found at ${targetPath}`)
  }
}

async function resolveOrCreateAuthorCertPath(
  profileName: string,
  configuredPath: string,
  tizenDataDir: string,
  authorPassword: string,
): Promise<string> {
  try {
    return resolveAuthorCertPath(profileName, configuredPath, tizenDataDir)
  }
  catch {
    const isAutoCreate = isTruthyEnv(process.env.TIZEN_AUTO_CREATE_AUTHOR_CERT)
    const targetPath = resolveAuthorCertTargetPath(profileName, configuredPath, tizenDataDir)

    if (isAutoCreate) {
      console.log(`Auto-creating author certificate at ${targetPath}`)
      createAuthorCertificate(profileName, targetPath, authorPassword)
      return targetPath
    }

    if (isCiEnvironment()) {
      throw new Error(
        `Author certificate not found for profile '${profileName}'. `
        + `Set TIZEN_AUTHOR_CERT_PATH to an existing certificate, `
        + `or set TIZEN_AUTO_CREATE_AUTHOR_CERT=1 to auto-create.`,
      )
    }

    const shouldCreate = await promptYesNo(`Author certificate not found. Create one now?`, true)

    if (shouldCreate) {
      console.log(`Creating author certificate at ${targetPath}`)
      createAuthorCertificate(profileName, targetPath, authorPassword)
      return targetPath
    }

    throw new Error(
      `Author certificate not found for profile '${profileName}'. `
      + `Set TIZEN_AUTHOR_CERT_PATH or run with TIZEN_AUTO_CREATE_AUTHOR_CERT=1`,
    )
  }
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

function upsertSigningProfile(
  profileName: string,
  authorCertPath: string,
  authorPassword: string,
  distributor: DistributorSigningInfo,
): void {
  try {
    execInherit('tizen', ['security-profiles', 'remove', '-n', profileName])
  }
  catch {}

  const args = [
    'security-profiles',
    'add',
    '-n',
    profileName,
    '-a',
    authorCertPath,
    '-p',
    authorPassword,
    '-A',
    '-f',
    '-d',
    distributor.certPath,
    '-dp',
    distributor.password,
  ]

  if (distributor.caPath) {
    args.push('-dc', distributor.caPath)
  }

  execInherit('tizen', args)
}

function createMinimalProfilesXml(profilesPath: string, profileName: string): void {
  const parentDir = path.dirname(profilesPath)
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true })
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    `<profiles active="${xmlEscape(profileName)}" version="3.1">`,
    `  <profile name="${xmlEscape(profileName)}">`,
    '    <profileitem ca="" distributor="0" key="" password="" rootca=""/>',
    '    <profileitem ca="" distributor="1" key="" password="" rootca=""/>',
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

async function main(): Promise<void> {
  loadDotEnvFile(envFilePath)

  ensureCommand('tizen', '\'tizen\' command not found in PATH. Add Tizen CLI to your PATH and retry.')
  ensureCommand('npx', '\'npx\' command not found in PATH.')

  const profileName = process.env.TIZEN_PROFILE ?? 'SignageProfile'
  const authorPassword = process.env.TIZEN_AUTHOR_CERT_PASSWORD ?? 'signage1234'
  const authorCertPath = process.env.TIZEN_AUTHOR_CERT_PATH ?? ''

  const profilesPath = resolveProfilesPath()
  const tizenDataDir = resolveTizenDataDir(profilesPath)
  const generatedProfilesPath = path.join(tizenDataDir, 'profile', `profiles-${profileName}.xml`)

  const version = getPackageJsonVersion(packageJsonPath)
  console.log('Tizen CLI: tizen (PATH)')
  console.log(`Version: ${version}`)

  updateWidgetVersion(configXmlPath, version)

  console.log('Building for Tizen...')
  execInherit('npx', ['vite', 'build', '--mode', 'tizen'])

  const resolvedAuthorCertPath = await resolveOrCreateAuthorCertPath(
    profileName,
    authorCertPath,
    tizenDataDir,
    authorPassword,
  )
  const distributorSigning = resolveDistributorSigningInfo()

  validatePkcs12Password(resolvedAuthorCertPath, authorPassword, 'author')
  validatePkcs12Password(distributorSigning.certPath, distributorSigning.password, 'distributor')

  configureProfilesPath(generatedProfilesPath)
  upsertSigningProfile(profileName, resolvedAuthorCertPath, authorPassword, distributorSigning)

  try {
    packageWgt(profileName, version)
  }
  finally {
    if (generatedProfilesPath !== profilesPath) {
      const fallbackProfilesPath = path.join(tizenDataDir, 'profile', 'profiles.xml')
      const restorePath = fs.existsSync(profilesPath) ? profilesPath : fallbackProfilesPath

      if (restorePath === fallbackProfilesPath && !fs.existsSync(profilesPath)) {
        console.warn(
          `Warning: Original profiles path ${profilesPath} not found. Restoring to ${fallbackProfilesPath}`,
        )
        createMinimalProfilesXml(fallbackProfilesPath, profileName)
      }

      try {
        configureProfilesPath(restorePath)
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
  await main()
}
catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`ERROR: ${message}`)
  process.exit(1)
}
