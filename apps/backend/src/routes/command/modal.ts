import type { CommandType } from '@signage/contracts'
import { z } from '@hono/zod-openapi'
import { t } from '@/app/i18n/index.js'

export interface DispatchCommandRequest {
  deviceId: string
  command: CommandType
  params?: Record<string, unknown>
  timeoutMs: number
}

export const COMMAND_TYPES = [
  'reload_playlist',
  'restart_player',
  'play',
  'pause',
  'set_volume',
  'screenshot',
] as const

const CommandTypeSchema = z.enum(COMMAND_TYPES)

const CommandErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
})

export const DispatchCommandRequestSchema = z
  .object({
    deviceId: z.string('deviceId required').trim().min(1, 'deviceId required'),
    command: CommandTypeSchema,
    params: z.record(z.string(), z.unknown()).optional(),
    timeoutMs: z.coerce.number().int().min(1000).max(60000).optional().default(10000),
  })
  .superRefine((value, ctx) => {
    if (value.command !== 'set_volume') {
      return
    }

    const level = value.params?.level
    if (typeof level !== 'number' || Number.isNaN(level) || level < 0 || level > 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['params', 'level'],
        message: t('set_volume_level_range'),
      })
    }
  })

export const CommandResultSchema = z.object({
  type: z.literal('command_result'),
  command: CommandTypeSchema,
  correlationId: z.string(),
  status: z.enum(['success', 'error']),
  timestamp: z.number(),
  payload: z.unknown().optional(),
  error: CommandErrorSchema.optional(),
})
