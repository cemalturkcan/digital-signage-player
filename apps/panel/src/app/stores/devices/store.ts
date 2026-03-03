import type { ActiveDevice } from '@signage/contracts'
import { defineStore } from 'pinia'
import { getActiveDevices } from '@/app/request/devices'

const DEFAULT_POLL_INTERVAL_MS = 1000

export interface DevicesState {
  items: ActiveDevice[]
  selectedDeviceId: string | null
  polling: boolean
  pollIntervalMs: number
  pollTimer: ReturnType<typeof setInterval> | null
  error: string | null
  lastUpdatedAt: string | null
}

function resolveSelectedDeviceId(
  currentSelected: string | null,
  items: ActiveDevice[],
): string | null {
  if (!items.length)
    return null

  if (currentSelected && items.some(item => item.deviceId === currentSelected)) {
    return currentSelected
  }

  return items[0].deviceId
}

export const useDevicesStore = defineStore('panel-devices', {
  state: (): DevicesState => ({
    items: [],
    selectedDeviceId: null,
    polling: false,
    pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
    pollTimer: null,
    error: null,
    lastUpdatedAt: null,
  }),

  persist: {
    pick: ['selectedDeviceId'],
  },

  getters: {
    selectedDevice: (state): ActiveDevice | null => {
      if (!state.selectedDeviceId)
        return null

      return state.items.find(item => item.deviceId === state.selectedDeviceId) ?? null
    },
  },

  actions: {
    setSelectedDevice(deviceId: string | null): void {
      this.selectedDeviceId = deviceId
    },

    async fetchActiveDevices(): Promise<void> {
      try {
        const items = await getActiveDevices()
        this.items = items
        this.selectedDeviceId = resolveSelectedDeviceId(this.selectedDeviceId, items)
        this.error = null
        this.lastUpdatedAt = new Date().toISOString()
      }
      catch (error) {
        this.error = error instanceof Error ? error.message : String(error)
      }
    },

    async startPolling(intervalMs = DEFAULT_POLL_INTERVAL_MS): Promise<void> {
      this.pollIntervalMs = intervalMs

      if (this.pollTimer)
        return

      this.polling = true
      await this.fetchActiveDevices()

      this.pollTimer = setInterval(() => {
        void this.fetchActiveDevices()
      }, this.pollIntervalMs)
    },

    stopPolling(): void {
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }

      this.polling = false
    },
  },
})
