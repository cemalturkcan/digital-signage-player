#!/usr/bin/env tsx
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
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
  } catch {}

  return path.join(
    process.env.USERPROFILE ?? process.env.HOME ?? '',
    'tizen-studio-data',
    'profile',
    'profiles.xml'
  )
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
  } catch {}
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

type DistributorSigningInfo = {
  certPath: string
  caPath: string
  password: string
}

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
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

  const certPath = certCandidates.find((candidate) => fs.existsSync(candidate)) || ''
  if (!certPath) {
    throw new Error(`Could not locate distributor signer certificate in ${distributorDir}`)
  }

  const caPath = caCandidates.find((candidate) => fs.existsSync(candidate)) || ''

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
  } catch {
    throw new Error(`Invalid ${label} certificate password for ${certPath}`)
  }
}

function writeSigningProfileFile(
  profilesPath: string,
  profileName: string,
  authorCertPath: string,
  authorPassword: string,
  distributor: DistributorSigningInfo
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
  console.log(`Signing profile file written: ${profilesPath}`)
}

function getDeveloperCaPassword(certificateGeneratorDir: string): string {
  const confPath = path.join(certificateGeneratorDir, 'certificates', 'developer', 'conf.ini')
  if (!fs.existsSync(confPath)) {
    throw new Error(`Developer CA config not found: ${confPath}`)
  }

  const conf = fs.readFileSync(confPath, 'utf8')
  const match = conf.match(/PASSWD_OF_ISSUER_FOR_DEV\s*=\s*(.+)/)
  if (!match) {
    throw new Error('Could not resolve developer CA password from conf.ini')
  }

  return match[1].trim()
}

function resolveOpenSslCommand(): string {
  if (commandExists('openssl')) {
    return 'openssl'
  }

  const candidates = [
    path.join(process.env.TIZEN_STUDIO_HOME ?? '', 'tools', 'msys2', 'usr', 'bin', 'openssl.exe'),
    path.join('C:\\', 'tizen-studio', 'tools', 'msys2', 'usr', 'bin', 'openssl.exe'),
    path.join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'usr', 'bin', 'openssl.exe'),
    path.join(
      process.env.ProgramFiles ?? 'C:\\Program Files',
      'Git',
      'mingw64',
      'bin',
      'openssl.exe'
    ),
  ]

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate
    }
  }

  throw new Error(
    'OpenSSL is not available in PATH and no bundled fallback was found. Install OpenSSL or Git for Windows.'
  )
}

function generateAuthorCertWithOpenSsl(
  authorPath: string,
  profileName: string,
  authorName: string,
  authorPassword: string
): string {
  const openSslCommand = resolveOpenSslCommand()

  const certificateGeneratorDir = resolveCertificateGeneratorDir()
  const developerDir = path.join(certificateGeneratorDir, 'certificates', 'developer')
  const developerCaCertPath = path.join(developerDir, 'tizen-developer-ca.cer')
  const developerCaKeyPath = path.join(developerDir, 'tizen-developer-ca-privatekey.pem')

  if (!fs.existsSync(developerCaCertPath) || !fs.existsSync(developerCaKeyPath)) {
    throw new Error('Required Tizen developer CA files are missing')
  }

  const developerCaPassword = getDeveloperCaPassword(certificateGeneratorDir)
  const keyPath = path.join(authorPath, `${profileName}-key.pem`)
  const csrPath = path.join(authorPath, `${profileName}.csr`)
  const certPath = path.join(authorPath, `${profileName}-cert.pem`)
  const outputP12Path = path.join(authorPath, `${profileName}.p12`)

  const subject = '/C=US/ST=CA/L=SF/O=Signage/OU=Dev/CN=SignageAuthor/emailAddress=dev@example.com'

  execInherit(openSslCommand, [
    'req',
    '-new',
    '-newkey',
    'rsa:2048',
    '-keyout',
    keyPath,
    '-out',
    csrPath,
    '-nodes',
    '-subj',
    subject,
  ])

  execInherit(openSslCommand, [
    'x509',
    '-req',
    '-in',
    csrPath,
    '-CA',
    developerCaCertPath,
    '-CAkey',
    developerCaKeyPath,
    '-CAcreateserial',
    '-out',
    certPath,
    '-days',
    '3650',
    '-sha256',
    '-passin',
    `pass:${developerCaPassword}`,
  ])

  execInherit(openSslCommand, [
    'pkcs12',
    '-export',
    '-out',
    outputP12Path,
    '-inkey',
    keyPath,
    '-in',
    certPath,
    '-certfile',
    developerCaCertPath,
    '-passout',
    `pass:${authorPassword}`,
    '-name',
    authorName,
  ])

  for (const tempPath of [keyPath, csrPath, certPath, `${developerCaCertPath}.srl`]) {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath)
    }
  }

  return outputP12Path
}

function resolveAuthorCertPath(
  profileName: string,
  configuredPath: string,
  tizenDataDir: string
): string {
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

  const homeCert = path.join(tizenDataDir, 'keystore', 'author', `${profileName}.p12`)
  if (fs.existsSync(homeCert)) {
    return homeCert
  }

  return ''
}

function ensureAuthorCertificate(
  profileName: string,
  authorName: string,
  authorPassword: string,
  configuredAuthorCertPath: string,
  tizenDataDir: string
): string {
  console.log(`Resolving author certificate for profile: ${profileName}`)

  let authorCertPath = resolveAuthorCertPath(profileName, configuredAuthorCertPath, tizenDataDir)
  if (!authorCertPath) {
    const absoluteConfigured = configuredAuthorCertPath
      ? path.isAbsolute(configuredAuthorCertPath)
        ? configuredAuthorCertPath
        : path.resolve(rootDir, configuredAuthorCertPath)
      : ''
    const authorPath = absoluteConfigured
      ? absoluteConfigured.toLowerCase().endsWith('.p12')
        ? path.dirname(absoluteConfigured)
        : absoluteConfigured
      : path.join(tizenDataDir, 'keystore', 'author')

    if (!fs.existsSync(authorPath)) {
      fs.mkdirSync(authorPath, { recursive: true })
    }

    try {
      execInherit('tizen', [
        'certificate',
        '-a',
        authorName,
        '-p',
        authorPassword,
        '-f',
        profileName,
        '--',
        authorPath,
      ])
    } catch {
      console.log('tizen certificate failed, trying OpenSSL fallback...')
      generateAuthorCertWithOpenSsl(authorPath, profileName, authorName, authorPassword)
    }

    authorCertPath = resolveAuthorCertPath(profileName, configuredAuthorCertPath, tizenDataDir)

    if (!authorCertPath) {
      const keytoolHint = commandExists('keytool') ? '' : ' keytool is not available in PATH.'
      const opensslHint = commandExists('openssl') ? '' : ' OpenSSL is not available in PATH.'
      throw new Error(
        `Could not generate author certificate for profile ${profileName}.${keytoolHint}${opensslHint}`
      )
    }
  }

  if (!authorCertPath) {
    throw new Error(`Could not find author certificate file for profile ${profileName}`)
  }

  return authorCertPath
}

function packageWgt(profileName: string, version: string): void {
  if (!fs.existsSync(configXmlPath)) {
    throw new Error('config.xml not found')
  }

  if (!fs.existsSync(distDir)) {
    throw new Error("dist/ not found. Run 'vite build --mode tizen' first.")
  }

  console.log('Copying config.xml to dist/')
  fs.copyFileSync(configXmlPath, path.join(distDir, 'config.xml'))

  console.log(`Packaging WGT with profile: ${profileName}`)
  execInherit('tizen', ['package', '-t', 'wgt', '-s', profileName, '--', distDir])

  const wgtFiles = fs.readdirSync(distDir).filter((name) => name.endsWith('.wgt'))
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

  ensureCommand('tizen', "'tizen' command not found in PATH. Add Tizen CLI to your PATH and retry.")
  ensureCommand('npx', "'npx' command not found in PATH.")

  const profileName = process.env.TIZEN_PROFILE || 'SignageProfile'
  const authorPassword = process.env.TIZEN_AUTHOR_CERT_PASSWORD || 'signage1234'
  const authorName = process.env.TIZEN_AUTHOR_CERT_NAME || 'SignageAuthor'
  const authorCertPath = process.env.TIZEN_AUTHOR_CERT_PATH || ''
  const profilesPath = resolveProfilesPath()
  const tizenDataDir = resolveTizenDataDir(profilesPath)
  const generatedProfilesPath = path.join(
    tizenDataDir || os.tmpdir(),
    'profile',
    `profiles-${profileName}.xml`
  )

  const version = getPackageJsonVersion(packageJsonPath)
  console.log('Tizen CLI: tizen (PATH)')
  console.log(`Version: ${version}`)

  updateWidgetVersion(configXmlPath, version)

  console.log('Building for Tizen...')
  execInherit('npx', ['vite', 'build', '--mode', 'tizen'])

  const resolvedAuthorCertPath = ensureAuthorCertificate(
    profileName,
    authorName,
    authorPassword,
    authorCertPath,
    tizenDataDir
  )
  const distributorSigning = resolveDistributorSigningInfo()

  validatePkcs12Password(resolvedAuthorCertPath, authorPassword, 'author')
  validatePkcs12Password(distributorSigning.certPath, distributorSigning.password, 'distributor')

  writeSigningProfileFile(
    generatedProfilesPath,
    profileName,
    resolvedAuthorCertPath,
    authorPassword,
    distributorSigning
  )

  configureProfilesPath(generatedProfilesPath)

  try {
    packageWgt(profileName, version)
  } finally {
    if (generatedProfilesPath !== profilesPath) {
      try {
        configureProfilesPath(profilesPath)
      } catch {}
    }
  }
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`ERROR: ${message}`)
  process.exit(1)
}
