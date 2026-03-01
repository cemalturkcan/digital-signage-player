import { z } from '@hono/zod-openapi'

export interface HealthStatus {
  status: 'ok'
}

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
})
