import { z } from '@hono/zod-openapi'

export interface PlaylistRecord {
  id: number
  deviceId: string
  name: string
  createdAt: number
  updatedAt: number
}

export interface PlaylistItemRecord {
  id: number
  playlistId: number
  mediaUrl: string
  mediaType: 'image' | 'video'
  duration: number | null
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export interface PlaylistItemInput {
  mediaUrl: string
  mediaType: 'image' | 'video'
  duration?: number
  sortOrder: number
}

function getNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return undefined
  }

  return normalizedValue
}

export function getPlaylistDeviceId(deviceId: unknown): string | undefined {
  return getNonEmptyString(deviceId)
}

export function getPlaylistId(id: unknown): string | undefined {
  return getNonEmptyString(id)
}

export const PlaylistMediaItemSchema = z.object({
  id: z.string(),
  type: z.enum(['image', 'video']),
  url: z.string(),
  duration: z.number().optional(),
  order: z.number().int(),
  checksum: z.string().optional(),
  mimeType: z.string().optional(),
})

export const PlaylistSchema = z.object({
  id: z.string(),
  items: z.array(PlaylistMediaItemSchema),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const PlaylistResponseSchema = z.object({
  playlist: PlaylistSchema,
  cache: z.object({
    etag: z.string(),
    maxAge: z.number(),
    cacheControl: z.string(),
  }),
})

export const PlaylistQuerySchema = z.object({
  deviceId: z.string('deviceId required').trim().min(1, 'deviceId required'),
})

export const PlaylistParamsSchema = z.object({
  id: z.string('id required').trim().min(1, 'id required'),
})
