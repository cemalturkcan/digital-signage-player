import type { Hono } from 'hono'
import { screenshotController } from '@/routes/screenshots/controller.js'

export function registerScreenshotRoutes(api: Hono): void {
  api.post('/screenshots', screenshotController.postScreenshot)
  api.get('/screenshots/:id', screenshotController.getScreenshotMetadata)
}
