import type { MediaItem } from '@signage/contracts'

export interface MediaPlayer {
  currentItem: MediaItem | null
  state: PlaybackState
  load: (item: MediaItem) => Promise<void>
  play: () => void
  pause: () => void
  stop: () => void
  setVolume: (level: number) => void
  getVolume: () => number
  captureScreenshot: () => Promise<Blob>
}

export type PlaybackState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error'

async function load(item: MediaItem): Promise<void> {
  void item
  throw new Error('Not implemented: load')
}

function play(): void {
  throw new Error('Not implemented: play')
}

function pause(): void {
  throw new Error('Not implemented: pause')
}

function stop(): void {
  throw new Error('Not implemented: stop')
}

function setVolume(level: number): void {
  void level
  throw new Error('Not implemented: setVolume')
}

function getVolume(): number {
  throw new Error('Not implemented: getVolume')
}

async function captureScreenshot(): Promise<Blob> {
  throw new Error('Not implemented: captureScreenshot')
}

export const mediaPlayer: MediaPlayer = {
  currentItem: null,
  state: 'idle',
  load,
  play,
  pause,
  stop,
  setVolume,
  getVolume,
  captureScreenshot,
}
