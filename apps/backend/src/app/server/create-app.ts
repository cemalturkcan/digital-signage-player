import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { logger } from '@/app/logger/logger.js'
import { httpLogger } from '@/app/middleware/index.js'
import { ErrorCode } from '@/app/rest/codes.js'
import { CORS_ORIGINS } from '@/config.js'
import { registerApiRoutes } from '@/routes/router.js'

export async function createApp(): Promise<OpenAPIHono> {
  const app = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) {
        const message = result.error.issues[0]?.message ?? 'Bad Request'
        return c.json(
          {
            error: message,
            code: ErrorCode.BAD_REQUEST,
            status: 400,
          },
          400,
        )
      }

      return undefined
    },
  })

  app.use('*', cors({ origin: CORS_ORIGINS }))
  app.use('*', httpLogger())

  registerApiRoutes(app)

  app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: {
      title: 'Digital Signage API',
      version: '1.0.0',
    },
  })

  app.get('/docs', swaggerUI({ url: '/openapi.json' }))

  app.notFound((c) => {
    return c.json({ error: 'Not Found' }, 404)
  })

  app.onError((err, c) => {
    logger.error({ err, path: c.req.path, method: c.req.method }, 'Request error')
    return c.json({ error: 'Internal Server Error' }, 500)
  })

  return app
}
