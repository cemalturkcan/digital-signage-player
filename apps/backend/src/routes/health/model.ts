export interface HealthStatus {
  status: 'healthy' | 'unhealthy'
  timestamp: number
  version: string
}

export interface ReadinessStatus {
  ready: boolean
  checks: {
    database: boolean
    mqtt: boolean
    storage: boolean
  }
}
