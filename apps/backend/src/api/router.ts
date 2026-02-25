import type { Hono } from 'hono'
import { registerHealthRoutes } from './health/routes.js'
import { registerRegisterRoutes } from './register/routes.js'
import { registerPlaylistRoutes } from './playlist/routes.js'
import { registerScreenshotRoutes } from './screenshots/routes.js'

export function registerApiRoutes(app: Hono): void {
  const api = app.basePath('/api')

  registerHealthRoutes(api)
  registerRegisterRoutes(api)
  registerPlaylistRoutes(api)
  registerScreenshotRoutes(api)
}
