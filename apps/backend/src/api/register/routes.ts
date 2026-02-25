import type { Hono } from 'hono'
import type {
  RegistrationRequest as _RegistrationRequest,
  RegistrationResponse as _RegistrationResponse,
} from '@signage/contracts'

export type { _RegistrationRequest, _RegistrationResponse }

async function postRegister(): Promise<Response> {
  throw new Error('Not implemented: postRegister')
}

async function postUnregister(): Promise<Response> {
  throw new Error('Not implemented: postUnregister')
}

export function registerRegisterRoutes(api: Hono): void {
  api.post('/register', postRegister)
  api.post('/unregister', postUnregister)
}
