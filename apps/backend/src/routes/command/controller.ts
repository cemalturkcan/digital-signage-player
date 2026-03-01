import type { Context } from 'hono'
import type { DispatchCommandRequest } from '@/routes/command/modal.js'
import { Res } from '@/app/rest/rest.js'
import { commandService } from '@/routes/command/service.js'

export const commandController = {
  async postCommand(c: Context) {
    const request = (
      c.req as unknown as { valid: (target: 'json') => DispatchCommandRequest }
    ).valid('json')
    const result = await commandService.send(request)
    return Res(result)
  },
}
