export interface ScreenshotService {
  capture: (deviceId: string, commandId: string) => Promise<string>
  getMetadata: (id: string) => Promise<unknown | null>
}

export const screenshotService: ScreenshotService = {
  async capture(deviceId: string, commandId: string): Promise<string> {
    void deviceId
    void commandId
    throw new Error('Not implemented: capture')
  },

  async getMetadata(id: string): Promise<unknown | null> {
    void id
    throw new Error('Not implemented: getMetadata')
  },
}
