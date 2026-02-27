import type { ServiceResponse } from '@/app/rest/rest.js'
import type { ScreenshotRecord } from '@/routes/screenshots/model.js'
import { ErrorCode } from '@/app/rest/codes.js'
import { fail, ok, unexpected } from '@/app/rest/rest.js'
import { screenshotRepository } from '@/routes/screenshots/repository.js'

export interface ScreenshotService {
  capture: (
    deviceId: string,
    commandId: string,
  ) => Promise<ServiceResponse<{ screenshotId: string }>>
  getMetadata: (id: string) => Promise<ServiceResponse<ScreenshotRecord | null>>
}

function generateId(deviceId: string, commandId: string): string {
  const timestamp = Date.now().toString(36)
  const hash = `${deviceId}-${commandId}-${timestamp}`
  return hash.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
}

export const screenshotService: ScreenshotService = {
  async capture(
    deviceId: string,
    commandId: string,
  ): Promise<ServiceResponse<{ screenshotId: string }>> {
    const normalizedDeviceId = deviceId.trim()
    const normalizedCommandId = commandId.trim()

    if (!normalizedDeviceId) {
      return fail(ErrorCode.BAD_REQUEST, 'deviceId required')
    }

    if (!normalizedCommandId) {
      return fail(ErrorCode.BAD_REQUEST, 'commandId required')
    }

    try {
      const id = generateId(normalizedDeviceId, normalizedCommandId)
      const now = Date.now()
      const record: ScreenshotRecord = {
        id,
        deviceId: normalizedDeviceId,
        commandId: normalizedCommandId,
        capturedAt: now,
        storedAt: now,
        path: `/screenshots/${id}.png`,
        size: 0,
        resolution: '1920x1080',
        format: 'png',
      }
      await screenshotRepository.save(record)
      return ok({ screenshotId: id })
    }
    catch (error) {
      return unexpected(error, 'Failed to capture screenshot metadata')
    }
  },

  async getMetadata(id: string): Promise<ServiceResponse<ScreenshotRecord | null>> {
    const normalizedId = id.trim()

    if (!normalizedId) {
      return fail(ErrorCode.BAD_REQUEST, 'id required')
    }

    try {
      const metadata = await screenshotRepository.findById(normalizedId)
      return ok(metadata)
    }
    catch (error) {
      return unexpected(error, 'Failed to get screenshot metadata')
    }
  },
}
