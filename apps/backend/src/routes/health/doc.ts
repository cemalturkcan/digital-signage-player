import type { OpenAPIHono } from '@hono/zod-openapi'
import { createRoute } from '@hono/zod-openapi'
import { DefaultErrorResponses, jsonResponse, registerHandler } from '@/app/rest/openapi.js'
import { healthController } from '@/routes/health/controller.js'
import { HealthResponseSchema } from '@/routes/health/modal.js'

const getHealthRoute = createRoute({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  responses: {
    200: jsonResponse(HealthResponseSchema, 'Health status'),
    500: DefaultErrorResponses[500],
  },
})

export const HealthDoc = {
  register(api: OpenAPIHono): void {
    registerHandler(api, getHealthRoute, healthController.getHealth)
  },
}
