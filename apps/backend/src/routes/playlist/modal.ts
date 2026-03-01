import { z } from '@hono/zod-openapi'

export interface PlaylistRecord {
  id: number
  deviceId: string | null
  name: string
  loop: boolean
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
  duration?: number | null
  sortOrder: number
}

export const PlaylistMediaItemSchema = z.object({
  id: z.string(),
  type: z.enum(['image', 'video']),
  url: z.string(),
  duration: z.number().nullable().optional(),
  order: z.number().int(),
  checksum: z.string().optional(),
  mimeType: z.string().optional(),
})

export const PlaylistSchema = z.object({
  id: z.string(),
  loop: z.boolean().optional(),
  items: z.array(PlaylistMediaItemSchema),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export const PlaylistResponseSchema = z.object({
  size: z.number().int().min(1),
  total: z.number().int().min(0),
  currentPage: z.number().int().min(1),
  totalPages: z.number().int().min(0),
  content: z.array(PlaylistSchema),
})

export const PlaylistQuerySchema = z.object({
  deviceId: z.string('deviceId required').trim().min(1, 'deviceId required'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
})

export const PlaylistParamsSchema = z.object({
  id: z.string('id required').trim().min(1, 'id required'),
})

export const PlaylistByIdQuerySchema = z.object({
  deviceId: z.string('deviceId required').trim().min(1, 'deviceId required'),
})
