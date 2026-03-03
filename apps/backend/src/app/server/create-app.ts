import { serveStatic } from '@hono/node-server/serve-static'
import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { logger } from '@/app/logger/logger.js'
import { httpLogger } from '@/app/middleware/index.js'
import { ErrorCode, getCodeMessage } from '@/app/rest/codes.js'
import { Err, ErrorRes } from '@/app/rest/rest.js'
import { CORS_ORIGINS } from '@/config.js'
import { registerApiRoutes } from '@/routes/router.js'

export async function createApp(): Promise<OpenAPIHono> {
  const app = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) {
        const issue = result.error.issues[0]
        const path = issue?.path.length ? issue.path.join('.') : undefined

        return c.json(
          {
            data: {
              path,
              message: issue?.message,
            },
            meta: {
              code: ErrorCode.BAD_REQUEST,
              message: getCodeMessage(ErrorCode.BAD_REQUEST),
            },
          },
          400,
        )
      }

      return undefined
    },
  })

  app.use('*', cors({ origin: CORS_ORIGINS }))
  app.use('*', httpLogger())
  app.use('/public/*', serveStatic({ root: './' }))

  const api = app.basePath('/api')

  registerApiRoutes(api)

  api.doc('/openapi.json', {
    openapi: '3.0.0',
    info: {
      title: 'Digital Signage API',
      version: '1.0.0',
    },
  })

  api.get('/docs', swaggerUI({ url: '/api/openapi.json' }))

  app.notFound((_c) => {
    return ErrorRes(new Err(ErrorCode.NOT_FOUND, getCodeMessage(ErrorCode.NOT_FOUND)))
  })

  app.onError((err, c) => {
    logger.error({ err, path: c.req.path, method: c.req.method }, 'Request error')
    return ErrorRes(
      new Err(ErrorCode.INTERNAL_SERVER_ERROR, getCodeMessage(ErrorCode.INTERNAL_SERVER_ERROR), err),
    )
  })

  return app
}
