declare const process: { env: Record<string, string | undefined> }

export interface PlayerConfig {
  deviceId: string
  registrationUrl: string
  deviceType: 'tizen' | 'webos' | 'web'
  storage: StorageConfig
  playback: PlaybackConfig
}

export interface StorageConfig {
  dbName: string
  maxCacheSize: number
  cleanupThreshold: number
}

export interface PlaybackConfig {
  defaultImageDuration: number
  transition: 'cut' | 'fade' | 'slide'
  transitionDuration: number
  loop: boolean
}

function parseString(val: string | undefined, def: string): string {
  return val ?? def
}

function parseNumber(val: string | undefined, def: number): number {
  if (!val)
    return def
  const n = Number(val)
  return Number.isNaN(n) ? def : n
}

function parseBool(val: string | undefined, def: boolean): boolean {
  if (!val)
    return def
  return val === 'true' || val === '1'
}

function parseDeviceType(val: string | undefined): 'tizen' | 'webos' | 'web' {
  if (val === 'webos' || val === 'web')
    return val
  return 'tizen'
}

function parseTransition(val: string | undefined): 'cut' | 'fade' | 'slide' {
  if (val === 'fade' || val === 'slide')
    return val
  return 'cut'
}

export function loadPlayerConfig(): PlayerConfig {
  return {
    deviceId: parseString(process.env.DEVICE_ID, 'unknown-device'),
    registrationUrl: parseString(process.env.REGISTRATION_URL, 'http://localhost:3000'),
    deviceType: parseDeviceType(process.env.DEVICE_TYPE),
    storage: {
      dbName: parseString(process.env.STORAGE_DB_NAME, 'signage-db'),
      maxCacheSize: parseNumber(process.env.STORAGE_MAX_CACHE_SIZE, 1073741824),
      cleanupThreshold: parseNumber(process.env.STORAGE_CLEANUP_THRESHOLD, 0.9),
    },
    playback: {
      defaultImageDuration: parseNumber(process.env.PLAYBACK_IMAGE_DURATION, 5000),
      transition: parseTransition(process.env.PLAYBACK_TRANSITION),
      transitionDuration: parseNumber(process.env.PLAYBACK_TRANSITION_DURATION, 500),
      loop: parseBool(process.env.PLAYBACK_LOOP, true),
    },
  }
}
