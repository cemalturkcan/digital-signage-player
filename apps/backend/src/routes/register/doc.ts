import type { OpenAPIHono } from '@hono/zod-openapi'
import { createRoute } from '@hono/zod-openapi'
import { DefaultErrorResponses, jsonResponse, registerHandler } from '@/app/rest/openapi.js'
import { registerController } from '@/routes/register/controller.js'
import { RegisterRequestSchema, RegisterResponseSchema } from '@/routes/register/modal.js'

const postRegisterRoute = createRoute({
  method: 'post',
  path: '/register',
  tags: ['Register'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: RegisterRequestSchema,
        },
      },
    },
  },
  responses: {
    200: jsonResponse(RegisterResponseSchema, 'Registration created or fetched'),
    400: DefaultErrorResponses[400],
    500: DefaultErrorResponses[500],
  },
})

export const RegisterDoc = {
  register(api: OpenAPIHono): void {
    registerHandler(api, postRegisterRoute, registerController.postRegister)
  },
}
