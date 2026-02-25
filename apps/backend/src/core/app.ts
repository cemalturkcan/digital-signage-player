import { Hono } from 'hono'
import { registerApiRoutes } from '../api/router.js'

export function createApp(): Hono {
  const app = new Hono()

  registerApiRoutes(app)

  app.notFound((c) => {
    return c.json({ error: 'Not Found' }, 404)
  })

  app.onError((err, c) => {
    console.error('Error:', err)
    return c.json({ error: 'Internal Server Error' }, 500)
  })

  return app
}
