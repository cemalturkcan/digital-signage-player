import type { ScreenshotRecord } from '@/routes/screenshots/model.js'
import { screenshotRepository } from '@/routes/screenshots/repository.js'

export interface ScreenshotService {
  capture: (deviceId: string, commandId: string) => Promise<string>
  getMetadata: (id: string) => Promise<ScreenshotRecord | null>
}

function generateId(deviceId: string, commandId: string): string {
  const timestamp = Date.now().toString(36)
  const hash = `${deviceId}-${commandId}-${timestamp}`
  return hash.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
}

export const screenshotService: ScreenshotService = {
  async capture(deviceId: string, commandId: string): Promise<string> {
    const id = generateId(deviceId, commandId)
    const now = Date.now()
    const record: ScreenshotRecord = {
      id,
      deviceId,
      commandId,
      capturedAt: now,
      storedAt: now,
      path: `/screenshots/${id}.png`,
      size: 0,
      resolution: '1920x1080',
      format: 'png',
    }
    await screenshotRepository.save(record)
    return id
  },

  async getMetadata(id: string): Promise<ScreenshotRecord | null> {
    return screenshotRepository.findById(id)
  },
}
