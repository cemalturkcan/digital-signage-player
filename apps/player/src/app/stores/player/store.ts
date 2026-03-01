import type { MediaItem } from '@signage/contracts'
import { defineStore } from 'pinia'
import { createTizenAdapter, getTizenScreenshotSupport } from '@/app/platform/tizen/adapter'

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
      const adapter = createTizenAdapter()
      adapter.setVolume(clamped)
    },
    async captureScreenshot(): Promise<Blob> {
      const support = getTizenScreenshotSupport()
      if (support.supported && support.capture) {
        const dataUrl = support.capture()
        if (dataUrl) {
          try {
            const response = await fetch(dataUrl)
            return await response.blob()
          }
          catch {
          }
        }
      }
      return generateFallbackScreenshot()
    },
  },
})

function generateFallbackScreenshot(): Blob {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 360
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Screenshot not available', canvas.width / 2, canvas.height / 2)
    const now = new Date().toISOString()
    ctx.font = '12px sans-serif'
    ctx.fillStyle = '#888888'
    ctx.fillText(now, canvas.width / 2, canvas.height / 2 + 24)
  }
  const dataUrl = canvas.toDataURL('image/png')
  const byteString = atob(dataUrl.split(',')[1])
  const mimeString = 'image/png'
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new Blob([ab], { type: mimeString })
}
