import type { ScreenshotMetadata, ScreenshotUploadResponse } from '@signage/contracts'
import { postRequest } from '@/app/modules/request'

export async function createScreenshot({
  payload,
}: {
  payload: ScreenshotMetadata
}): Promise<ScreenshotUploadResponse> {
  return postRequest<ScreenshotUploadResponse>({
    url: '/api/screenshots',
    payload,
  })
}
