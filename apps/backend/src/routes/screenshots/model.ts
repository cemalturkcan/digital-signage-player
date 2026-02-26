export interface ScreenshotRecord {
  id: string
  deviceId: string
  commandId: string
  capturedAt: number
  storedAt: number
  path: string
  size: number
  resolution: string
  format: string
}
