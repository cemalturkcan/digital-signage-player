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

let mediaPlayerInstance: MediaPlayer | null = null

function createMediaPlayerInternal(): MediaPlayer {
  throw new Error('Not implemented: createMediaPlayer')
}

export function createMediaPlayer(): MediaPlayer {
  if (!mediaPlayerInstance) {
    mediaPlayerInstance = createMediaPlayerInternal()
  }
  return mediaPlayerInstance
}

export function getMediaPlayer(): MediaPlayer {
  if (!mediaPlayerInstance) {
    throw new Error('Not implemented: getMediaPlayer')
  }
  return mediaPlayerInstance
}

export function resetMediaPlayer(): void {
  mediaPlayerInstance = null
}
