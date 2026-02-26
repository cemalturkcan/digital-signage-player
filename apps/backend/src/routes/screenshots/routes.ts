import type { Hono } from 'hono'
import { screenshotService } from './service.js'

async function postScreenshot(c: {
  req: { json: () => Promise<{ deviceId: string, commandId: string }> }
}): Promise<Response> {
  const { deviceId, commandId } = await c.req.json()
  const screenshotId = await screenshotService.capture(deviceId, commandId)
  return Response.json({ screenshotId })
}

async function getScreenshotMetadata(c: {
  req: { param: (name: string) => string | undefined }
}): Promise<Response> {
  const id = c.req.param('id')
  if (!id) {
    return Response.json({ error: 'id required' }, { status: 400 })
  }
  const metadata = await screenshotService.getMetadata(id)
  return Response.json(metadata)
}

export function registerScreenshotRoutes(api: Hono): void {
  api.post('/screenshots', postScreenshot)
  api.get('/screenshots/:id', getScreenshotMetadata)
}
