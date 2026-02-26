import type { Hono } from 'hono'
import type { RegistrationRequest } from '@signage/contracts'
import { registerService } from '@/routes/register/service.js'

async function postRegister(c: {
  req: { json: () => Promise<RegistrationRequest> }
}): Promise<Response> {
  const request = await c.req.json()
  const response = await registerService.register(request)
  return Response.json(response)
}

async function postUnregister(c: {
  req: { json: () => Promise<{ deviceId: string }> }
}): Promise<Response> {
  const { deviceId } = await c.req.json()
  await registerService.unregister(deviceId)
  return new Response(null, { status: 204 })
}

export function registerRegisterRoutes(api: Hono): void {
  api.post('/register', postRegister)
  api.post('/unregister', postUnregister)
}
