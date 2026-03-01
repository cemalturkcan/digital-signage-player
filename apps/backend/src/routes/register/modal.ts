import { z } from '@hono/zod-openapi'

export interface DeviceRecord {
  deviceId: string
  mqttUsername: string
  mqttPassword: string
}

export function getRegisterDeviceId(request: unknown): string | undefined {
  if (!request || typeof request !== 'object') {
    return undefined
  }

  const { deviceId } = request as { deviceId?: unknown }

  if (typeof deviceId !== 'string') {
    return undefined
  }

  const normalizedDeviceId = deviceId.trim()

  if (!normalizedDeviceId) {
    return undefined
  }

  return normalizedDeviceId
}

export const RegisterRequestSchema = z.object({
  deviceId: z.string('deviceId required').trim().min(1, 'deviceId required'),
  deviceInfo: z.record(z.string(), z.unknown()).optional(),
  capabilities: z
    .object({
      screenshot: z.boolean(),
      videoCodecs: z.array(z.string()),
      maxResolution: z.string(),
      storageQuota: z.number().optional(),
    })
    .optional(),
})

export const RegisterResponseSchema = z.object({
  mqtt: z.object({
    host: z.string(),
    port: z.number(),
    ssl: z.boolean(),
    clientId: z.string(),
    username: z.string(),
    password: z.string(),
    keepalive: z.number(),
    connectTimeout: z.number(),
    reconnectPeriod: z.number(),
    clean: z.boolean(),
  }),
})
