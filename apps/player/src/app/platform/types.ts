export interface PlatformAdapter {
  initialize: () => Promise<void>
  isAvailable: () => boolean
  getDeviceInfo: () => Record<string, unknown>
  setVolume: (level: number) => void
  getVolume: () => number
  captureScreenshot: () => Promise<Blob | null>
}
