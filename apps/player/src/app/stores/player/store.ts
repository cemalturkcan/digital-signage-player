import type { MediaItem } from '@signage/contracts'
import { defineStore } from 'pinia'
import { createPlatformAdapter } from '@/app/platform/factory'

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
      await new Promise(resolve => setTimeout(resolve, 50))
      this.state = 'ready'
    },
    play(): void {
      if (this.state === 'ready' || this.state === 'paused') {
        this.state = 'playing'
      }
    },
    pause(): void {
      if (this.state === 'playing') {
        this.state = 'paused'
      }
    },
    stop(): void {
      this.state = 'idle'
    },
    setVolume(level: number): void {
      const clamped = Math.max(0, Math.min(100, level))
      this.volume = clamped
      const adapter = createPlatformAdapter()
      adapter.setVolume(clamped)
    },
    async captureScreenshot(): Promise<Blob> {
      const adapter = createPlatformAdapter()
      const blob = await adapter.captureScreenshot()
      if (blob)
        return blob

      throw new Error('Screenshot capture unavailable')
    },
  },
})
