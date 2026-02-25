import type { Hono } from 'hono'
import type { ScreenshotUploadResponse as _ScreenshotUploadResponse } from '@signage/contracts'

export type { _ScreenshotUploadResponse }

async function postScreenshot(): Promise<Response> {
  throw new Error('Not implemented: postScreenshot')
}

async function getScreenshotMetadata(): Promise<Response> {
  throw new Error('Not implemented: getScreenshotMetadata')
}

export function registerScreenshotRoutes(api: Hono): void {
  api.post('/screenshots', postScreenshot)
  api.get('/screenshots/:id', getScreenshotMetadata)
}
