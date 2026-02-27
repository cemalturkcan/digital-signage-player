import type { OpenAPIHono } from '@hono/zod-openapi'
import { HealthDoc } from '@/routes/health/doc.js'
import { PlaylistDoc } from '@/routes/playlist/doc.js'
import { RegisterDoc } from '@/routes/register/doc.js'

export function registerApiRoutes(app: OpenAPIHono): void {
  const api = app.basePath('/api')

  HealthDoc.register(api)
  RegisterDoc.register(api)
  PlaylistDoc.register(api)
}
