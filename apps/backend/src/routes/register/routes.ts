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

export function registerRegisterRoutes(api: Hono): void {
  api.post('/register', postRegister)
}
