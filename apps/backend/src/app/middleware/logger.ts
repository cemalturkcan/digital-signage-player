import type { MiddlewareHandler } from 'hono'
import { logger } from '@/app/logger/logger.js'

const EXCLUDED_PATHS = ['/api/health', '/api/openapi.json', '/api/docs']

export function httpLogger(): MiddlewareHandler {
  return async (c, next) => {
    const path = new URL(c.req.url).pathname

    if (EXCLUDED_PATHS.some(p => path === p || path.startsWith(`${p}/`))) {
      return next()
    }

    const start = Date.now()
    const method = c.req.method

    logger.info({ type: 'request', method, path })

    await next()

    const duration = Date.now() - start
    const status = c.res.status

    logger.info({ type: 'response', method, path, status, duration: `${duration}ms` })
  }
}
