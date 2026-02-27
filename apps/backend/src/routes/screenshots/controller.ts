import { toHttpResponse } from '@/app/rest/rest.js'
import { screenshotService } from '@/routes/screenshots/service.js'

interface ScreenshotRequest {
  deviceId?: string
  commandId?: string
}

export const screenshotController = {
  async postScreenshot(c: { req: { json: () => Promise<ScreenshotRequest> } }): Promise<Response> {
    const request = await c.req.json()
    const result = await screenshotService.capture(request.deviceId ?? '', request.commandId ?? '')
    return toHttpResponse(result)
  },

  async getScreenshotMetadata(c: {
    req: { param: (name: string) => string | undefined }
  }): Promise<Response> {
    const id = c.req.param('id') ?? ''
    const result = await screenshotService.getMetadata(id)
    return toHttpResponse(result)
  },
}
