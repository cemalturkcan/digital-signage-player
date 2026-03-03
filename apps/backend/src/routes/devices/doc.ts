import type { OpenAPIHono } from '@hono/zod-openapi'
import { createRoute } from '@hono/zod-openapi'
import { DefaultErrorResponses, jsonResponse, registerHandler } from '@/app/rest/openapi.js'
import { devicesController } from '@/routes/devices/controller.js'
import {
  DeviceRegistrationRequestSchema,
  DeviceRegistrationResponseSchema,
} from '@/routes/devices/modal.js'

const postRegisterDeviceRoute = createRoute({
  method: 'post',
  path: '/devices/register',
  tags: ['Devices'],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: DeviceRegistrationRequestSchema,
        },
      },
    },
  },
  responses: {
    200: jsonResponse(DeviceRegistrationResponseSchema, 'Device registered or fetched'),
    400: DefaultErrorResponses[400],
    500: DefaultErrorResponses[500],
  },
})

export const DevicesDoc = {
  register(api: OpenAPIHono): void {
    registerHandler(api, postRegisterDeviceRoute, devicesController.postRegisterDevice)
  },
}
