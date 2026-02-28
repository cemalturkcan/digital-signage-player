import type { RegistrationResponse } from '@signage/contracts'
import { defineStore } from 'pinia'

export interface DeviceState {
  deviceId: string | null
  registration: RegistrationResponse | null
}

function generateDeviceId(): string {
  return crypto.randomUUID()
}

export const useDeviceStore = defineStore('device', {
  state: (): DeviceState => ({
    deviceId: generateDeviceId(),
    registration: null,
  }),

  persist: {
    pick: ['deviceId', 'registration'],
  },

  getters: {
    isRegistered: (state): boolean => state.registration !== null,
    mqttConfig: (state): RegistrationResponse['mqtt'] | null => state.registration?.mqtt ?? null,
  },

  actions: {
    setRegistration(registration: RegistrationResponse): void {
      this.registration = registration
    },

    clearRegistration(): void {
      this.registration = null
    },

    getDeviceId(): string {
      return this.deviceId!
    },
  },
})
