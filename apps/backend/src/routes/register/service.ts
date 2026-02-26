import type { RegistrationRequest, RegistrationResponse } from '@signage/contracts'

export interface RegisterService {
  register: (request: RegistrationRequest) => Promise<RegistrationResponse>
  unregister: (deviceId: string) => Promise<void>
  getRegistration: (deviceId: string) => Promise<RegistrationResponse | null>
  isRegistered: (deviceId: string) => Promise<boolean>
}

export const registerService: RegisterService = {
  async register(request: RegistrationRequest): Promise<RegistrationResponse> {
    void request
    throw new Error('Not implemented: register')
  },

  async unregister(deviceId: string): Promise<void> {
    void deviceId
    throw new Error('Not implemented: unregister')
  },

  async getRegistration(deviceId: string): Promise<RegistrationResponse | null> {
    void deviceId
    throw new Error('Not implemented: getRegistration')
  },

  async isRegistered(deviceId: string): Promise<boolean> {
    void deviceId
    throw new Error('Not implemented: isRegistered')
  },
}
