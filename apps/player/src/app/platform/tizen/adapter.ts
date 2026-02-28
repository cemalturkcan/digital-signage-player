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

interface TizenWindow {
  tizen?: {
    tvfw?: {
      setVolume?: (v: number) => void
      getVolume?: () => number
      captureScreen?: () => string
    }
    systeminfo?: {
      getCapabilities?: () => { screenShotSupport?: boolean }
      getTotalMemory?: () => number
    }
    productinfo?: {
      getModel?: () => string
      getVersion?: () => string
    }
  }
  webapis?: {
    productinfo?: {
      getModelCode?: () => string
    }
  }
}

let inMemoryVolume = 100

function getTizen(): TizenWindow['tizen'] {
  if (typeof window === 'undefined') {
    return undefined
  }
  return (window as TizenWindow).tizen
}

export function createTizenAdapter(): TizenAdapter {
  return {
    async initialize(): Promise<void> {
      const tizen = getTizen()
      if (tizen?.tvfw?.getVolume) {
        try {
          const vol = tizen.tvfw.getVolume()
          if (typeof vol === 'number') {
            inMemoryVolume = Math.max(0, Math.min(100, vol))
          }
        }
        catch {
          // Use default in-memory volume
        }
      }
    },

    isAvailable(): boolean {
      return typeof getTizen() !== 'undefined'
    },

    createPlayer(): PlayerStore {
      throw new Error('Player creation not supported: use usePlayerStore directly')
    },

    getDeviceInfo(): Record<string, unknown> {
      const tizen = getTizen()
      const info: Record<string, unknown> = {
        platform: 'browser',
        model: 'unknown',
        version: 'unknown',
      }
      if (!tizen) {
        return info
      }
      info.platform = 'tizen'
      if (tizen.productinfo?.getModel) {
        try {
          info.model = tizen.productinfo.getModel()
        }
        catch {
          // Keep default
        }
      }
      if (tizen.productinfo?.getVersion) {
        try {
          info.version = tizen.productinfo.getVersion()
        }
        catch {
          // Keep default
        }
      }
      if (tizen.systeminfo?.getTotalMemory) {
        try {
          info.totalMemory = tizen.systeminfo.getTotalMemory()
        }
        catch {
          // Omit if unavailable
        }
      }
      return info
    },

    setVolume(level: number): void {
      const clamped = Math.max(0, Math.min(100, level))
      inMemoryVolume = clamped
      const tizen = getTizen()
      if (tizen?.tvfw?.setVolume) {
        try {
          tizen.tvfw.setVolume(clamped)
        }
        catch {
          // State already updated in memory
        }
      }
    },

    getVolume(): number {
      const tizen = getTizen()
      if (tizen?.tvfw?.getVolume) {
        try {
          const vol = tizen.tvfw.getVolume()
          if (typeof vol === 'number') {
            inMemoryVolume = Math.max(0, Math.min(100, vol))
          }
        }
        catch {
          // Return in-memory value
        }
      }
      return inMemoryVolume
    },
  }
}

export function getTizenScreenshotSupport(): { supported: boolean, capture?: () => string | null } {
  const tizen = getTizen()
  if (!tizen) {
    return { supported: false }
  }
  const caps = tizen.systeminfo?.getCapabilities?.()
  if (caps?.screenShotSupport && tizen.tvfw?.captureScreen) {
    return {
      supported: true,
      capture: (): string | null => {
        try {
          return tizen.tvfw?.captureScreen?.() ?? null
        }
        catch {
          return null
        }
      },
    }
  }
  return { supported: false }
}
