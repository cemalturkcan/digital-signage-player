import type { RegistrationRequest } from '@signage/contracts'
import type { Context } from 'hono'
import { ErrorCode } from '@/app/rest/codes.js'
import { fail, Res } from '@/app/rest/rest.js'
import { getDeviceRegistrationDeviceId } from '@/routes/devices/modal.js'
import { devicesService } from '@/routes/devices/service.js'

export const devicesController = {
  async getActiveDevices(_c: Context) {
    const result = await devicesService.getActiveDevices()
    return Res(result)
  },

  async postRegisterDevice(c: Context) {
    const request = await c.req.json<RegistrationRequest>()
    const deviceId = getDeviceRegistrationDeviceId(request)

    if (!deviceId) {
      return Res(fail(ErrorCode.BAD_REQUEST, 'deviceId required'))
    }

    const result = await devicesService.registerDevice({
      ...request,
      deviceId,
    })

    return Res(result)
  },
}
