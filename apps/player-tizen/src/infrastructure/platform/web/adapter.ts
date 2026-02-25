import type { MediaPlayer } from '../../../application/player/service'

export interface WebAdapter {
  initialize: () => Promise<void>
  isAvailable: () => boolean
  createPlayer: () => MediaPlayer
  getDeviceInfo: () => Record<string, unknown>
  setVolume: (level: number) => void
  getVolume: () => number
}

export function createWebAdapter(): WebAdapter {
  throw new Error('Not implemented: createWebAdapter')
}
