import type { OpenAPIHono } from '@hono/zod-openapi'
import { HealthDoc } from '@/routes/health/doc.js'
import { PlaylistDoc } from '@/routes/playlist/doc.js'
import { RegisterDoc } from '@/routes/register/doc.js'

export function registerApiRoutes(app: OpenAPIHono): void {
  HealthDoc.register(app)
  RegisterDoc.register(app)
  PlaylistDoc.register(app)
}
