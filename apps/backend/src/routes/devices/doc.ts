import type { OpenAPIHono } from '@hono/zod-openapi'
import { createRoute } from '@hono/zod-openapi'
import { DefaultErrorResponses, jsonResponse, registerHandler } from '@/app/rest/openapi.js'
import { devicesController } from '@/routes/devices/controller.js'
import {
  ActiveDevicesResponseSchema,
  DeviceRegistrationRequestSchema,
  DeviceRegistrationResponseSchema,
} from '@/routes/devices/modal.js'

const getActiveDevicesRoute = createRoute({
  method: 'get',
  path: '/devices/active',
  tags: ['Devices'],
  responses: {
    200: jsonResponse(ActiveDevicesResponseSchema, 'Active devices'),
    500: DefaultErrorResponses[500],
  },
})

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
    registerHandler(api, getActiveDevicesRoute, devicesController.getActiveDevices)
    registerHandler(api, postRegisterDeviceRoute, devicesController.postRegisterDevice)
  },
}
