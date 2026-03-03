import { z } from '@hono/zod-openapi'

export interface DeviceRecord {
  deviceId: string
  mqttUsername: string
  mqttPassword: string
}

export interface ActiveDevice {
  deviceId: string
  isOnline: boolean
  lastSeenAt: string | null
  lastPresenceReason: string | null
}

export function getDeviceRegistrationDeviceId(request: unknown): string | undefined {
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

export const DeviceRegistrationRequestSchema = z.object({
  deviceId: z.string().trim().min(1, 'deviceId required'),
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

export const DeviceRegistrationResponseSchema = z.object({
  mqtt: z.object({
    host: z.string(),
    port: z.number(),
    ssl: z.boolean(),
    path: z.string(),
    clientId: z.string(),
    username: z.string(),
    password: z.string(),
    keepalive: z.number(),
    connectTimeout: z.number(),
    reconnectPeriod: z.number(),
    clean: z.boolean(),
    will: z
      .object({
        topic: z.string(),
        payload: z.string(),
        qos: z.union([z.literal(0), z.literal(1), z.literal(2)]),
        retain: z.boolean(),
      })
      .optional(),
  }),
})

export const ActiveDeviceSchema = z.object({
  deviceId: z.string(),
  isOnline: z.boolean(),
  lastSeenAt: z.string().datetime().nullable(),
  lastPresenceReason: z.string().nullable(),
})

export const ActiveDevicesResponseSchema = z.array(ActiveDeviceSchema)
