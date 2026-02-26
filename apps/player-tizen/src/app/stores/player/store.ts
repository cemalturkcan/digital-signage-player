import { defineStore } from 'pinia'
import type { MediaItem } from '@signage/contracts'

export type PlaybackState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error'

export interface PlayerState {
  currentItem: MediaItem | null
  state: PlaybackState
  volume: number
}

export const usePlayerStore = defineStore('player', {
  state: (): PlayerState => ({
    currentItem: null,
    state: 'idle',
    volume: 100,
  }),

  actions: {
    async load(item: MediaItem): Promise<void> {
      this.currentItem = item
      this.state = 'loading'
      throw new Error('Not implemented: load')
    },
    play(): void {
      throw new Error('Not implemented: play')
    },
    pause(): void {
      throw new Error('Not implemented: pause')
    },
    stop(): void {
      throw new Error('Not implemented: stop')
    },
    setVolume(level: number): void {
      this.volume = level
      throw new Error('Not implemented: setVolume')
    },
    async captureScreenshot(): Promise<Blob> {
      throw new Error('Not implemented: captureScreenshot')
    },
  },
})
