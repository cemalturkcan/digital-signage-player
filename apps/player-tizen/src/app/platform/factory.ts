import type { MediaPlayer } from '../../application/player/service'

export type PlatformType = 'tizen' | 'webos' | 'web'

export interface PlatformAdapter {
  platform: PlatformType
  initialize: () => Promise<void>
  createPlayer: () => MediaPlayer
  getDeviceInfo: () => Record<string, unknown>
  setVolume: (level: number) => void
  getVolume: () => number
}

async function initialize(): Promise<void> {
  throw new Error('Not implemented: initialize')
}

function createPlayer(): MediaPlayer {
  throw new Error('Not implemented: createPlayer')
}

function getDeviceInfo(): Record<string, unknown> {
  throw new Error('Not implemented: getDeviceInfo')
}

function setVolume(level: number): void {
  void level
  throw new Error('Not implemented: setVolume')
}

function getVolume(): number {
  throw new Error('Not implemented: getVolume')
}

export const platformAdapter: PlatformAdapter = {
  platform: 'web',
  initialize,
  createPlayer,
  getDeviceInfo,
  setVolume,
  getVolume,
}

export function detectPlatform(): PlatformType {
  throw new Error('Not implemented: detectPlatform')
}
