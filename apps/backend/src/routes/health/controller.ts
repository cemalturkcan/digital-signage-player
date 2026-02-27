import { toHttpResponse } from '@/app/rest/rest.js'
import { healthService } from '@/routes/health/service.js'

export const healthController = {
  async getHealth(): Promise<Response> {
    const result = await healthService.getHealth()
    return toHttpResponse(result)
  },
}
