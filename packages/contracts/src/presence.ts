export type PresenceStatus = 'online' | 'offline'

export interface PresenceEnvelope {
  type: 'presence'
  status: PresenceStatus
  reason: string
  ts?: number
}

export interface ActiveDevice {
  deviceId: string
  isOnline: boolean
  lastSeenAt: string | null
  lastPresenceReason: string | null
}
