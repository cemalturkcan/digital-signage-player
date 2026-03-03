import type { OpenAPIHono } from '@hono/zod-openapi'
import { CommandDoc } from '@/routes/command/doc.js'
import { DevicesDoc } from '@/routes/devices/doc.js'
import { HealthDoc } from '@/routes/health/doc.js'
import { PlaylistDoc } from '@/routes/playlist/doc.js'

export function registerApiRoutes(app: OpenAPIHono): void {
  CommandDoc.register(app)
  DevicesDoc.register(app)
  HealthDoc.register(app)
  PlaylistDoc.register(app)
}
