import type { Context } from 'hono'
import type { DispatchCommandRequest } from '@/routes/command/modal.js'
import { Res } from '@/app/rest/rest.js'
import { commandService } from '@/routes/command/service.js'

export const commandController = {
  async postCommand(c: Context) {
    const request = await c.req.json<DispatchCommandRequest>()
    const result = await commandService.send(request)
    return Res(result)
  },
}
