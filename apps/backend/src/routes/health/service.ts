import type { HealthStatus, ReadinessStatus } from './model.js'
import { healthRepository } from './repository.js'

export interface HealthService {
  getHealth: () => Promise<HealthStatus>
  getReady: () => Promise<ReadinessStatus>
}

export const healthService: HealthService = {
  async getHealth(): Promise<HealthStatus> {
    return healthRepository.getHealth()
  },

  async getReady(): Promise<ReadinessStatus> {
    return healthRepository.getReadiness()
  },
}
