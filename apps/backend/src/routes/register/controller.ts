import type { RegistrationRequest } from '@signage/contracts'
import type { Context } from 'hono'
import { ErrorCode } from '@/app/rest/codes.js'
import { fail, Res } from '@/app/rest/rest.js'
import { getRegisterDeviceId } from '@/routes/register/modal.js'
import { registerService } from '@/routes/register/service.js'

export const registerController = {
  async postRegister(c: Context) {
    const request = await c.req.json<RegistrationRequest>()
    const deviceId = getRegisterDeviceId(request)

    if (!deviceId) {
      return Res(fail(ErrorCode.BAD_REQUEST, 'deviceId required'))
    }

    const result = await registerService.register({
      ...request,
      deviceId,
    })

    return Res(result)
  },
}
