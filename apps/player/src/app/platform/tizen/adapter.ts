import type { PlatformAdapter } from '@/app/platform/types'

interface TizenWindow {
  tizen?: {
    tvfw?: {
      setVolume?: (value: number) => void
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
}

let inMemoryVolume = 100

function getTizen(): TizenWindow['tizen'] {
  if (typeof window === 'undefined') {
    return undefined
  }

  return (window as TizenWindow).tizen
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob | null> {
  try {
    const response = await fetch(dataUrl)
    return await response.blob()
  }
  catch {
    return null
  }
}

export function createTizenPlatformAdapter(): PlatformAdapter {
  return {
    async initialize(): Promise<void> {
      const tizen = getTizen()
      if (!tizen?.tvfw?.getVolume) {
        return
      }

      try {
        const volume = tizen.tvfw.getVolume()
        inMemoryVolume = Math.max(0, Math.min(100, volume))
      }
      catch {}
    },

    isAvailable(): boolean {
      return typeof getTizen() !== 'undefined'
    },

    getDeviceInfo(): Record<string, unknown> {
      const tizen = getTizen()
      const info: Record<string, unknown> = {
        platform: 'tizen',
      }

      if (!tizen) {
        return info
      }

      if (tizen.productinfo?.getModel) {
        try {
          info.model = tizen.productinfo.getModel()
        }
        catch {}
      }

      if (tizen.productinfo?.getVersion) {
        try {
          info.version = tizen.productinfo.getVersion()
        }
        catch {}
      }

      if (tizen.systeminfo?.getTotalMemory) {
        try {
          info.totalMemory = tizen.systeminfo.getTotalMemory()
        }
        catch {}
      }

      return info
    },

    setVolume(level: number): void {
      const volume = Math.max(0, Math.min(100, level))
      inMemoryVolume = volume

      const tizen = getTizen()
      if (!tizen?.tvfw?.setVolume) {
        return
      }

      try {
        tizen.tvfw.setVolume(volume)
      }
      catch {}
    },

    getVolume(): number {
      const tizen = getTizen()
      if (!tizen?.tvfw?.getVolume) {
        return inMemoryVolume
      }

      try {
        const volume = tizen.tvfw.getVolume()
        if (typeof volume === 'number') {
          inMemoryVolume = Math.max(0, Math.min(100, volume))
        }
      }
      catch {}

      return inMemoryVolume
    },

    async captureScreenshot(): Promise<Blob | null> {
      const tizen = getTizen()
      const supportsScreenshot = tizen?.systeminfo?.getCapabilities?.()?.screenShotSupport

      if (!supportsScreenshot || !tizen?.tvfw?.captureScreen) {
        return null
      }

      try {
        const dataUrl = tizen.tvfw.captureScreen()
        if (!dataUrl) {
          return null
        }

        return await dataUrlToBlob(dataUrl)
      }
      catch {
        return null
      }
    },
  }
}
