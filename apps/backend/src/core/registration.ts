import type { RegistrationRequest, RegistrationResponse } from '@signage/contracts'

export interface RegistrationService {
  register: (request: RegistrationRequest) => Promise<RegistrationResponse>
  unregister: (deviceId: string) => Promise<void>
  getRegistration: (deviceId: string) => Promise<RegistrationResponse | null>
  isRegistered: (deviceId: string) => Promise<boolean>
}

let registrationServiceInstance: RegistrationService | null = null

function createRegistrationServiceInternal(): RegistrationService {
  throw new Error('Not implemented: createRegistrationService')
}

export function createRegistrationService(): RegistrationService {
  if (!registrationServiceInstance) {
    registrationServiceInstance = createRegistrationServiceInternal()
  }
  return registrationServiceInstance
}

export function getRegistrationService(): RegistrationService {
  if (!registrationServiceInstance) {
    throw new Error('Not implemented: getRegistrationService')
  }
  return registrationServiceInstance
}

export function resetRegistrationService(): void {
  registrationServiceInstance = null
}
