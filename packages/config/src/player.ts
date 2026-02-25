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

export function loadPlayerConfig(): PlayerConfig {
  throw new Error('Not implemented: loadPlayerConfig')
}
