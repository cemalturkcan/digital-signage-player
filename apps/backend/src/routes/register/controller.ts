import type { RegistrationRequest } from '@signage/contracts'
import type { Context } from 'hono'
import { Res } from '@/app/rest/rest.js'
import { getRegisterDeviceId } from '@/routes/register/modal.js'
import { registerService } from '@/routes/register/service.js'

export const registerController = {
  async postRegister(c: Context) {
    const request = await c.req.json<RegistrationRequest>()
    const deviceId = getRegisterDeviceId(request)!

    const result = await registerService.register({
      ...request,
      deviceId,
    })

    return Res(result)
  },
}
