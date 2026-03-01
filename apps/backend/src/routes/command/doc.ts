import type { OpenAPIHono } from '@hono/zod-openapi'
import { createRoute } from '@hono/zod-openapi'
import { DefaultErrorResponses, jsonResponse, registerHandler } from '@/app/rest/openapi.js'
import { commandController } from '@/routes/command/controller.js'
import { CommandResultSchema, DispatchCommandRequestSchema } from '@/routes/command/modal.js'

const postCommandRoute = createRoute({
  method: 'post',
  path: '/command',
  tags: ['Command'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: DispatchCommandRequestSchema,
        },
      },
    },
  },
  responses: {
    200: jsonResponse(CommandResultSchema, 'Device command result'),
    400: DefaultErrorResponses[400],
    500: DefaultErrorResponses[500],
  },
})

export const CommandDoc = {
  register(api: OpenAPIHono): void {
    registerHandler(api, postCommandRoute, commandController.postCommand)
  },
}
