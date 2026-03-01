import type { CommandResultEnvelope } from '@signage/contracts'
import type { ICommandResultHandler } from '@/routes/command/handler-registry.js'
import type { DispatchCommandRequest } from '@/routes/command/modal.js'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { logger } from '@/app/logger/logger.js'

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'public', 'screenshots')

interface ScreenshotPayload {
  base64: string
  mimeType?: string
}

function isScreenshotPayload(value: unknown): value is ScreenshotPayload {
  if (!value || typeof value !== 'object')
    return false

  const payload = value as Record<string, unknown>

  return (
    typeof payload.base64 === 'string'
    && payload.base64.trim().length > 0
    && (typeof payload.mimeType === 'undefined' || typeof payload.mimeType === 'string')
  )
}

async function saveFile(
  deviceId: string,
  payload: ScreenshotPayload,
): Promise<{ fileName: string, publicPath: string }> {
  const extension = getExtension(payload.mimeType)
  const fileName = `${Date.now()}-${randomUUID()}.${extension}`
  const directory = path.join(SCREENSHOT_DIR, deviceId)

  await mkdir(directory, { recursive: true })
  await writeFile(path.join(directory, fileName), Buffer.from(payload.base64, 'base64'))

  return {
    fileName,
    publicPath: `/public/screenshots/${deviceId}/${fileName}`,
  }
}

function getExtension(mimeType?: string): string {
  switch (mimeType) {
    case 'image/jpeg': return 'jpg'
    case 'image/webp': return 'webp'
    default: return 'png'
  }
}

export const screenshotHandler: ICommandResultHandler = {
  command: 'screenshot',

  async handle(request: DispatchCommandRequest, result: CommandResultEnvelope): Promise<CommandResultEnvelope> {
    if (result.status !== 'success')
      return result

    const payload = result.payload
    if (!isScreenshotPayload(payload))
      throw new Error('Invalid screenshot payload from device')

    const saved = await saveFile(request.deviceId, payload)
    logger.info({ deviceId: request.deviceId, ...saved }, 'Screenshot saved')

    return {
      ...result,
      payload: { ...saved, mimeType: payload.mimeType ?? 'image/png' },
    }
  },
}
