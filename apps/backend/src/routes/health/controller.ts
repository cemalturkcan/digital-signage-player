import type { Context } from 'hono'
import { Res } from '@/app/rest/rest.js'
import { healthService } from '@/routes/health/service.js'

export const healthController = {
  async getHealth(_c: Context) {
    const result = await healthService.getHealth()
    return Res(result)
  },
}
