import type { MediaPlayer } from '../../application/player/service'
import type { TizenAdapter as _TizenAdapter } from './tizen/adapter'
import type { WebAdapter as _WebAdapter } from './web/adapter'

export type { _TizenAdapter, _WebAdapter }

export type PlatformType = 'tizen' | 'webos' | 'web'

export interface PlatformAdapter {
  platform: PlatformType
  initialize: () => Promise<void>
  createPlayer: () => MediaPlayer
  getDeviceInfo: () => Record<string, unknown>
  setVolume: (level: number) => void
  getVolume: () => number
}

let platformAdapterInstance: PlatformAdapter | null = null

export function detectPlatform(): PlatformType {
  throw new Error('Not implemented: detectPlatform')
}

function createPlatformAdapterInternal(): PlatformAdapter {
  throw new Error('Not implemented: createPlatformAdapter')
}

export function createPlatformAdapter(): PlatformAdapter {
  if (!platformAdapterInstance) {
    platformAdapterInstance = createPlatformAdapterInternal()
  }
  return platformAdapterInstance
}

export function getPlatformAdapter(): PlatformAdapter {
  if (!platformAdapterInstance) {
    throw new Error('Not implemented: getPlatformAdapter')
  }
  return platformAdapterInstance
}

export function resetPlatformAdapter(): void {
  platformAdapterInstance = null
}
