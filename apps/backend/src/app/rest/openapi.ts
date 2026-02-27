import type { OpenAPIHono, RouteConfig, RouteHandler } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'

/**
 * Helper to register an OpenAPI route handler without explicit type casts.
 * Encapsulates the `as unknown as RouteHandler<...>` cast internally.
 */
export function registerHandler<R extends RouteConfig>(
  api: OpenAPIHono,
  route: R,
  handler: RouteHandler<R>,
): void {
  api.openapi(route, handler as unknown as RouteHandler<R>)
}

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  status: z.number().int(),
})

function createErrorResponse(description: string) {
  return {
    description,
    content: {
      'application/json': {
        schema: ErrorResponseSchema,
      },
    },
  }
}

export const DefaultErrorResponses = {
  400: createErrorResponse('Bad Request'),
  404: createErrorResponse('Not Found'),
  500: createErrorResponse('Internal Server Error'),
} as const

export function jsonResponse<T>(schema: T, description: string) {
  return {
    description,
    content: {
      'application/json': {
        schema,
      },
    },
  }
}
