import type { HealthStatus } from '@/routes/health/model.js'

export interface HealthRepository {
  getHealth: () => Promise<HealthStatus>
}

export const healthRepository: HealthRepository = {
  async getHealth(): Promise<HealthStatus> {
    return { status: 'ok' }
  },
}
