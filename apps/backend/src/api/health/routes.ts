import type { Hono } from 'hono'

async function getHealth(): Promise<Response> {
  throw new Error('Not implemented: getHealth')
}

async function getReady(): Promise<Response> {
  throw new Error('Not implemented: getReady')
}

export function registerHealthRoutes(api: Hono): void {
  api.get('/health', getHealth)
  api.get('/health/ready', getReady)
}
