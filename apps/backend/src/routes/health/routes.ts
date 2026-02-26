import type { Hono } from 'hono'
import { healthService } from './service.js'

async function getHealth(): Promise<Response> {
  const status = await healthService.getHealth()
  return Response.json(status)
}

async function getReady(): Promise<Response> {
  const status = await healthService.getReady()
  return Response.json(status)
}

export function registerHealthRoutes(api: Hono): void {
  api.get('/health', getHealth)
  api.get('/health/ready', getReady)
}
