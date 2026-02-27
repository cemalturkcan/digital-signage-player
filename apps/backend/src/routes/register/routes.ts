import type { Hono } from 'hono'
import { registerController } from '@/routes/register/controller.js'

export function registerRegisterRoutes(api: Hono): void {
  api.post('/register', registerController.postRegister)
}
