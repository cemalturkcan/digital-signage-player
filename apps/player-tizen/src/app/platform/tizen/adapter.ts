import type { MediaPlayer } from '../../../application/player/service'

export interface TizenAdapter {
  initialize: () => Promise<void>
  isAvailable: () => boolean
  createPlayer: () => MediaPlayer
  getDeviceInfo: () => Record<string, unknown>
  setVolume: (level: number) => void
  getVolume: () => number
}

export function createTizenAdapter(): TizenAdapter {
  throw new Error('Not implemented: createTizenAdapter')
}
