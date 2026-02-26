import type { Hono } from 'hono'
import { registerHealthRoutes } from '@/routes/health/routes.js'
import { registerRegisterRoutes } from '@/routes/register/routes.js'
import { registerPlaylistRoutes } from '@/routes/playlist/routes.js'
import { registerScreenshotRoutes } from '@/routes/screenshots/routes.js'

export function registerApiRoutes(app: Hono): void {
  const api = app.basePath('/api')

  registerHealthRoutes(api)
  registerRegisterRoutes(api)
  registerPlaylistRoutes(api)
  registerScreenshotRoutes(api)
}
