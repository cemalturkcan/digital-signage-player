import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import * as process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const isWindows = process.platform === 'win32'

export const rootDir = path.resolve(scriptDir, '..')
export const distDir = path.join(rootDir, 'dist')

function quoteForCmd(arg: string): string {
  if (arg.startsWith('"') && arg.endsWith('"')) {
    return arg
  }

  if (!arg.includes(' ') && !arg.includes('"') && !arg.includes('%')) {
    return arg
  }
  return `"${arg.replace(/"/g, '""').replace(/%/g, '%%')}"`
}

function runRaw(command: string, args: string[], options: Record<string, unknown> = {}) {
  const isWin = process.platform === 'win32'

  let env = { ...process.env }
  if (isWin) {
    const java8Path = 'C:\\Program Files\\Java\\jre1.8.0_471'
    if (fs.existsSync(java8Path)) {
      env = {
        ...process.env,
        JAVA_HOME: java8Path,
        PATH: `${java8Path}\\bin;${process.env.PATH ?? ''}`,
      }
    }
  }

  if (isWin) {
    const quotedCommand = quoteForCmd(command)
    const quotedArgs = args.map(quoteForCmd)
    const cmdLine = [quotedCommand, ...quotedArgs].join(' ')

    const result = spawnSync('cmd.exe', ['/d', '/s', '/c', cmdLine], {
      encoding: 'utf8',
      cwd: rootDir,
      shell: false,
      env,
      ...options,
    })

    if (result.error) {
      throw result.error
    }

    return result
  }

  const result = spawnSync(command, args, {
    encoding: 'utf8',
    cwd: rootDir,
    shell: false,
    env,
    ...options,
  })

  if (result.error) {
    throw result.error
  }

  return result
}

function getCombinedOutput(result: ReturnType<typeof runRaw>) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`
}

export function execInherit(
  command: string,
  args: string[],
  options: Record<string, unknown> = {},
): void {
  const result = runRaw(command, args, {
    stdio: 'inherit',
    ...options,
  })

  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${command} ${args.join(' ')}`)
  }
}

export function execCapture(
  command: string,
  args: string[],
  options: Record<string, unknown> = {},
): string {
  const result = runRaw(command, args, {
    stdio: 'pipe',
    ...options,
  })

  const output = getCombinedOutput(result)
  if (result.status !== 0) {
    throw new Error(output || `Command failed (${result.status}): ${command} ${args.join(' ')}`)
  }

  return output
}

export function commandExists(command: string): boolean {
  const lookupCommand = isWindows ? 'where' : 'which'
  const result = spawnSync(lookupCommand, [command], {
    stdio: 'ignore',
    shell: false,
  })

  return !result.error && result.status === 0
}

export function ensureCommand(command: string, message: string): void {
  if (!commandExists(command)) {
    throw new Error(message)
  }
}

export function loadDotEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`.env.tizen not found at ${filePath}`)
  }

  const content = fs.readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith('\'') && value.endsWith('\''))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

export function resolveSdbCommand(): string {
  if (commandExists('sdb')) {
    return 'sdb'
  }

  const homeDir = os.homedir()
  const fallback
    = process.platform === 'win32'
      ? path.join(homeDir, 'tizen-studio', 'tools', 'sdb.exe')
      : path.join(homeDir, 'tizen-studio', 'tools', 'sdb')

  if (!fs.existsSync(fallback)) {
    throw new Error(`sdb command not found in PATH and fallback path does not exist: ${fallback}`)
  }

  return fallback
}

function parseConnectedDevices(sdbOutput: string): string[] {
  const devices: string[] = []

  for (const rawLine of sdbOutput.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('List of devices attached')) {
      continue
    }

    const parts = line.split(/\s+/)
    if (parts.length < 2) {
      continue
    }

    const [serial, state] = parts
    if (state === 'device') {
      devices.push(serial)
    }
  }

  return devices
}

function sleepMs(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

export function waitForTargetSerial(sdbCommand: string, timeoutSeconds = 45): string {
  for (let second = 0; second < timeoutSeconds; second++) {
    const output = execCapture(sdbCommand, ['devices'])
    const devices = parseConnectedDevices(output)

    if (devices.length > 0) {
      return devices[0]
    }

    sleepMs(1000)
  }

  throw new Error('No connected Tizen device/emulator found')
}

export function updateWidgetVersion(configXmlPath: string, version: string): void {
  const current = fs.readFileSync(configXmlPath, 'utf8')
  const versionPattern = /(<widget\s[^>]*\sversion\s*=\s*)(["'])([^"']*)(\2)/
  const matched = current.match(versionPattern)

  if (!matched) {
    throw new Error('Could not update widget version in config.xml')
  }

  if (matched[3] === version) {
    return
  }

  const next = current.replace(versionPattern, `$1$2${version}$2`)

  fs.writeFileSync(configXmlPath, next)
}

export function getPackageJsonVersion(packageJsonPath: string): string {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as { version: string }
  return pkg.version
}

export function getAppPackageId(configXmlPath: string): string {
  const configXml = fs.readFileSync(configXmlPath, 'utf8')
  const match = configXml.match(/<tizen:application\s[^>]*\spackage\s*=\s*["']([^"']+)["']/)

  if (!match) {
    throw new Error('Could not resolve package id from config.xml')
  }

  return match[1]
}

export function getAppId(configXmlPath: string): string {
  const configXml = fs.readFileSync(configXmlPath, 'utf8')
  const match = configXml.match(/<tizen:application[^>]*\sid\s*=\s*["']([^"']+)["']/)

  if (!match) {
    throw new Error('Could not resolve app id from config.xml')
  }

  return match[1]
}

export function resolveLatestWgt(root: string): string {
  const files = fs
    .readdirSync(root)
    .filter(name => /^digital_signage_player_.*\.wgt$/.test(name))
    .map(name => path.join(root, name))

  if (files.length === 0) {
    throw new Error(`No WGT file found in ${root}. Run 'pnpm run build' first.`)
  }

  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
  return files[0]
}

export function resolveWgtInput(root: string, inputPath?: string): string {
  if (!inputPath) {
    return resolveLatestWgt(root)
  }

  const absoluteInput = path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(process.cwd(), inputPath)
  if (fs.existsSync(absoluteInput)) {
    return absoluteInput
  }

  const fromRoot = path.join(root, inputPath)
  if (fs.existsSync(fromRoot)) {
    return fromRoot
  }

  throw new Error(`WGT file not found: ${inputPath}`)
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let index = 0

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index++
  }

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}
