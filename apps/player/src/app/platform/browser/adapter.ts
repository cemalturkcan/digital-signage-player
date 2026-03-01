import type { PlatformAdapter } from '@/app/platform/types'

let inMemoryVolume = 100

export function createBrowserPlatformAdapter(): PlatformAdapter {
  return {
    async initialize(): Promise<void> {
      // No-op for browser fallback
    },

    isAvailable(): boolean {
      return typeof window !== 'undefined'
    },

    getDeviceInfo(): Record<string, unknown> {
      return {
        platform: 'browser',
      }
    },

    setVolume(level: number): void {
      inMemoryVolume = Math.max(0, Math.min(100, level))
    },

    getVolume(): number {
      return inMemoryVolume
    },

    async captureScreenshot(): Promise<Blob | null> {
      return null
    },
  }
}
