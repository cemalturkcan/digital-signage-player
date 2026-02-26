import type { HealthStatus, ReadinessStatus } from './model.js'

export interface HealthRepository {
  getHealth: () => Promise<HealthStatus>
  getReadiness: () => Promise<ReadinessStatus>
}

export const healthRepository: HealthRepository = {
  async getHealth(): Promise<HealthStatus> {
    throw new Error('Not implemented: getHealth')
  },

  async getReadiness(): Promise<ReadinessStatus> {
    throw new Error('Not implemented: getReadiness')
  },
}
