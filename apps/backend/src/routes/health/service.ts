import type { HealthStatus } from '@/routes/health/model.js'
import { healthRepository } from '@/routes/health/repository.js'

export interface HealthService {
  getHealth: () => Promise<HealthStatus>
}

export const healthService: HealthService = {
  async getHealth(): Promise<HealthStatus> {
    return healthRepository.getHealth()
  },
}
