#!/usr/bin/env tsx
import * as fs from 'node:fs'
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
  } catch {
    // Ignore and fall through to default path.
  }

  return path.join(
    process.env.USERPROFILE ?? process.env.HOME ?? '',
    'tizen-studio-data',
    'profile',
    'profiles.xml'
  )
}

function getProfileNames(): string[] {
  try {
    const output = execCapture('tizen', ['security-profiles', 'list'])
    const names: string[] = []

    for (const rawLine of output.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('Loaded in') || line.startsWith('[Profile Name]')) {
        continue
      }

      const matched = line.match(/^([^\s]+)/)
      if (matched) {
        names.push(matched[1])
      }
    }

    return names
  } catch {
    return []
  }
}

function profileExists(profileName: string): boolean {
  return getProfileNames().includes(profileName)
}

function resolveTizenDataDir(profilesPath: string): string {
  const profileDir = path.dirname(profilesPath)
  return path.dirname(profileDir)
}

function resolveCertificateGeneratorDir(): string {
  const candidates = [
    path.join(process.env.TIZEN_STUDIO_HOME ?? '', 'tools', 'certificate-generator'),
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
    path.join(
      process.env['ProgramFiles'] ?? 'C:\\Program Files',
      'Git',
      'usr',
      'bin',
      'openssl.exe'
    ),
    path.join(
      process.env['ProgramFiles'] ?? 'C:\\Program Files',
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

function resolveDistributorDefaults(): {
  authorCaPath: string
  distPath: string
  distCaPath: string
  distPassword: string
} {
  const certificateGeneratorDir = resolveCertificateGeneratorDir()
  const authorCaPath = path.join(
    certificateGeneratorDir,
    'certificates',
    'developer',
    'tizen-developer-ca.cer'
  )
  const distPath = path.join(
    certificateGeneratorDir,
    'certificates',
    'distributor',
    'tizen-distributor-signer.p12'
  )
  const distCaPath = path.join(
    certificateGeneratorDir,
    'certificates',
    'distributor',
    'tizen-distributor-ca.cer'
  )

  const confProfilesPath = path.resolve(
    certificateGeneratorDir,
    '..',
    'ide',
    'conf-ncli',
    'profiles.xml'
  )
  if (!fs.existsSync(confProfilesPath)) {
    throw new Error(`Default distributor config not found: ${confProfilesPath}`)
  }

  const content = fs.readFileSync(confProfilesPath, 'utf8')
  const match = content.match(
    /<profileitem[\s\S]*?distributor="1"[\s\S]*?password="([^"]+)"[\s\S]*?\/>/
  )
  if (!match) {
    throw new Error('Could not resolve distributor password from Tizen default profile config')
  }

  return {
    authorCaPath,
    distPath,
    distCaPath,
    distPassword: match[1],
  }
}

function ensureProfileInProfilesXml(
  profilesPath: string,
  profileName: string,
  authorCertPath: string,
  authorPassword: string
): void {
  const { authorCaPath, distPath, distCaPath, distPassword } = resolveDistributorDefaults()

  const profileBlock = [
    `  <profile name="${profileName}">`,
    `    <profileitem ca="${authorCaPath.replace(/\\/g, '/')}" distributor="0" key="${authorCertPath.replace(/\\/g, '/')}" password="${authorPassword}" rootca=""/>`,
    `    <profileitem ca="${distCaPath.replace(/\\/g, '/')}" distributor="1" key="${distPath.replace(/\\/g, '/')}" password="${distPassword}" rootca=""/>`,
    '    <profileitem ca="" distributor="2" key="" password="" rootca=""/>',
    '  </profile>',
  ].join('\n')

  const defaultXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<profiles version="2.2">',
    '</profiles>',
    '',
  ].join('\n')

  fs.mkdirSync(path.dirname(profilesPath), { recursive: true })

  const current = fs.existsSync(profilesPath) ? fs.readFileSync(profilesPath, 'utf8') : ''
  const hasProfile = new RegExp(`<profile\\s+name="${profileName}"`).test(current)
  if (hasProfile) {
    return
  }

  const base = current.includes('<profiles') ? current : defaultXml
  const next = base.replace('</profiles>', `${profileBlock}\n</profiles>`)
  fs.writeFileSync(profilesPath, next)
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

function ensureSigningProfile(
  profileName: string,
  authorName: string,
  authorPassword: string,
  configuredAuthorCertPath: string,
  tizenDataDir: string,
  profilesPath: string
): void {
  if (profileExists(profileName)) {
    console.log(`Profile exists: ${profileName}`)
    return
  }

  console.log(`Creating certificate and profile: ${profileName}`)

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
  } catch {
    if (!profileExists(profileName)) {
      console.log('security-profiles add failed, writing profiles.xml fallback...')
      ensureProfileInProfilesXml(profilesPath, profileName, authorCertPath, authorPassword)

      if (!profileExists(profileName)) {
        throw new Error(
          `Could not create security profile: ${profileName}. Check 'tizen security-profiles list' and '${profilesPath}'.`
        )
      }
    }
  }

  console.log(`Profile created: ${profileName}`)
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

  const version = getPackageJsonVersion(packageJsonPath)
  console.log('Tizen CLI: tizen (PATH)')
  console.log(`Version: ${version}`)

  updateWidgetVersion(configXmlPath, version)

  console.log('Building for Tizen...')
  execInherit('npx', ['vite', 'build', '--mode', 'tizen'])

  ensureSigningProfile(
    profileName,
    authorName,
    authorPassword,
    authorCertPath,
    tizenDataDir,
    profilesPath
  )

  packageWgt(profileName, version)
}

try {
  main()
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`ERROR: ${message}`)
  process.exit(1)
}
