export interface DeviceRecord {
  deviceId: string
  deviceType: string
  orgId: string
  locationId: string
  registeredAt: number
  lastSeenAt: number
  topics: {
    commands: string
    responses: string
    status: string
    events: string
  }
}
