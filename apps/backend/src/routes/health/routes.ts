import type { Hono } from 'hono'
import { healthService } from '@/routes/health/service.js'

async function getHealth(): Promise<Response> {
  const status = await healthService.getHealth()
  return Response.json(status)
}

export function registerHealthRoutes(api: Hono): void {
  api.get('/health', getHealth)
}
