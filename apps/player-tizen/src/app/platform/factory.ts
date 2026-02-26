import type { usePlayerStore } from '@/app/stores/player/store'

export type PlayerStore = ReturnType<typeof usePlayerStore>

export interface TizenAdapter {
  initialize: () => Promise<void>
  isAvailable: () => boolean
  createPlayer: () => PlayerStore
  getDeviceInfo: () => Record<string, unknown>
  setVolume: (level: number) => void
  getVolume: () => number
}

export function createTizenAdapter(): TizenAdapter {
  throw new Error('Not implemented: createTizenAdapter')
}
