import type { Hono } from 'hono'
import { healthController } from '@/routes/health/controller.js'

export function registerHealthRoutes(api: Hono): void {
  api.get('/health', healthController.getHealth)
}
