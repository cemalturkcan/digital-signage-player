import type { OpenAPIHono, RouteConfig } from '@hono/zod-openapi'
import { z } from '@hono/zod-openapi'
import { BAD_REQUEST, getCodeMessage, NOT_FOUND, SERVER_INTERNAL_ERROR, SUCCESS, UNAUTHORIZED } from '@/app/rest/codes.js'

export function registerHandler<R extends RouteConfig>(
  api: OpenAPIHono,
  route: R,
  handler: any,
): void {
  api.openapi(route, handler)
}

const SuccessMetaSchema = z.object({
  code: z.string().default(SUCCESS),
  message: z.string().default(getCodeMessage(SUCCESS)),
})

const BadRequestDataSchema = z.union([
  z.object({
    path: z.string().optional(),
    message: z.string().optional(),
  }),
  z.null(),
])

const BadRequestResponseSchema = z.object({
  data: BadRequestDataSchema,
  meta: z.object({
    code: z.string().default(BAD_REQUEST),
    message: z.string().default(getCodeMessage(BAD_REQUEST)),
  }),
})

const NotFoundResponseSchema = z.object({
  data: z.null(),
  meta: z.object({
    code: z.string().default(NOT_FOUND),
    message: z.string().default(getCodeMessage(NOT_FOUND)),
  }),
})

const InternalErrorResponseSchema = z.object({
  data: z.null(),
  meta: z.object({
    code: z.string().default(SERVER_INTERNAL_ERROR),
    message: z.string().default(getCodeMessage(SERVER_INTERNAL_ERROR)),
  }),
})

const UnauthorizedResponseSchema = z.object({
  data: z.null(),
  meta: z.object({
    code: z.string().default(UNAUTHORIZED),
    message: z.string().default(getCodeMessage(UNAUTHORIZED)),
  }),
})

function createResponse<T extends z.ZodTypeAny>(schema: T, description: string) {
  return {
    description,
    content: {
      'application/json': {
        schema,
      },
    },
  }
}

function createErrorResponse<T extends z.ZodTypeAny>(schema: T, description: string) {
  return createResponse(schema, description)
}

export const DefaultErrorResponses = {
  400: createErrorResponse(BadRequestResponseSchema, getCodeMessage(BAD_REQUEST)),
  401: createErrorResponse(UnauthorizedResponseSchema, getCodeMessage(UNAUTHORIZED)),
  404: createErrorResponse(NotFoundResponseSchema, getCodeMessage(NOT_FOUND)),
  500: createErrorResponse(InternalErrorResponseSchema, getCodeMessage(SERVER_INTERNAL_ERROR)),
} as const

export function jsonResponse<T extends z.ZodTypeAny>(schema: T, description: string) {
  return createResponse(
    z.object({
      data: schema,
      meta: SuccessMetaSchema,
    }),
    description,
  )
}
