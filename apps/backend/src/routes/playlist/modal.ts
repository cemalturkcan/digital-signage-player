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

function getPositiveInteger(value: unknown): number | undefined {
  const normalized = getNonEmptyString(value)
  if (!normalized) {
    return undefined
  }

  const parsed = Number.parseInt(normalized, 10)
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return undefined
  }

  return parsed
}

export function getPlaylistPage(value: unknown): number {
  return getPositiveInteger(value) ?? 1
}

export function getPlaylistPageSize(value: unknown): number {
  const pageSize = getPositiveInteger(value) ?? 10
  return Math.min(pageSize, 100)
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
  playlists: z.array(PlaylistSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    totalItems: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  }),
})

export const PlaylistQuerySchema = z.object({
  deviceId: z.string('deviceId required').trim().min(1, 'deviceId required'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
})

export const PlaylistParamsSchema = z.object({
  id: z.string('id required').trim().min(1, 'id required'),
})
