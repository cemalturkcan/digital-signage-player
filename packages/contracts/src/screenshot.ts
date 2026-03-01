export interface ScreenshotMetadata {
  commandId: string
  deviceId: string
  capturedAt: number
  resolution: string
  format: 'jpeg' | 'png' | 'webp'
  currentItemId?: string
}

export interface ScreenshotUploadResponse {
  status: 'success' | 'error'
  url?: string
  screenshotId?: string
  error?: {
    code: string
    message: string
  }
}

export interface ScreenshotConfig {
  maxWidth: number
  maxHeight: number
  quality: number
  format: 'jpeg' | 'png' | 'webp'
}
