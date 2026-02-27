import type { ServiceResponse } from '@/app/rest/rest.js'
import type { HealthStatus } from '@/routes/health/modal.js'
import { ok, unexpected } from '@/app/rest/rest.js'
import { healthRepository } from '@/routes/health/repository.js'

export interface HealthService {
  getHealth: () => Promise<ServiceResponse<HealthStatus>>
}

export const healthService: HealthService = {
  async getHealth(): Promise<ServiceResponse<HealthStatus>> {
    try {
      const status = await healthRepository.getHealth()
      return ok(status)
    }
    catch (error) {
      return unexpected(error, 'Failed to get health status')
    }
  },
}
