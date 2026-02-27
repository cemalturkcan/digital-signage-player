import type { ScreenshotRecord } from '@/routes/screenshots/model.js'

export interface ScreenshotRepository {
  save: (metadata: ScreenshotRecord) => Promise<void>
  findById: (id: string) => Promise<ScreenshotRecord | null>
  findByDevice: (deviceId: string) => Promise<ScreenshotRecord[]>
}

const store = new Map<string, ScreenshotRecord>()

export const screenshotRepository: ScreenshotRepository = {
  async save(metadata: ScreenshotRecord): Promise<void> {
    store.set(metadata.id, metadata)
  },

  async findById(id: string): Promise<ScreenshotRecord | null> {
    return store.get(id) ?? null
  },

  async findByDevice(deviceId: string): Promise<ScreenshotRecord[]> {
    return Array.from(store.values()).filter(r => r.deviceId === deviceId)
  },
}
