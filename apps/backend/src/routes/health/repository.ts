import type { HealthStatus } from '@/routes/health/modal.js'

export interface HealthRepository {
  getHealth: () => Promise<HealthStatus>
}

export const healthRepository: HealthRepository = {
  async getHealth(): Promise<HealthStatus> {
    return { status: 'ok' }
  },
}
