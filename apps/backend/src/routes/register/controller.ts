import type { RegistrationRequest } from '@signage/contracts'
import { toHttpResponse } from '@/app/rest/rest.js'
import { registerService } from '@/routes/register/service.js'

export const registerController = {
  async postRegister(c: { req: { json: () => Promise<RegistrationRequest> } }): Promise<Response> {
    const request = await c.req.json()
    const result = await registerService.register(request)
    return toHttpResponse(result)
  },
}
