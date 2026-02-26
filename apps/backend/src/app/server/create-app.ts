import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { registerApiRoutes } from '@/routes/router.js'
import { CORS_ORIGINS } from '@/config.js'
import { logger } from '@/app/logger/logger.js'

export async function createApp(): Promise<Hono> {
  const app = new Hono()

  app.use('*', cors({ origin: CORS_ORIGINS }))

  registerApiRoutes(app)

  app.notFound((c) => {
    return c.json({ error: 'Not Found' }, 404)
  })

  app.onError((err, c) => {
    logger.error({ err, path: c.req.path, method: c.req.method }, 'Request error')
    return c.json({ error: 'Internal Server Error' }, 500)
  })

  return app
}
