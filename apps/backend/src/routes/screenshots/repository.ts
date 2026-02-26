import type { ScreenshotRecord } from '@/routes/screenshots/model.js'

export interface ScreenshotRepository {
  save: (metadata: ScreenshotRecord) => Promise<void>
  findById: (id: string) => Promise<ScreenshotRecord | null>
  findByDevice: (deviceId: string) => Promise<ScreenshotRecord[]>
}

export const screenshotRepository: ScreenshotRepository = {
  async save(metadata: ScreenshotRecord): Promise<void> {
    void metadata
    throw new Error('Not implemented: save')
  },

  async findById(id: string): Promise<ScreenshotRecord | null> {
    void id
    throw new Error('Not implemented: findById')
  },

  async findByDevice(deviceId: string): Promise<ScreenshotRecord[]> {
    void deviceId
    throw new Error('Not implemented: findByDevice')
  },
}
