import type { MqttBrokerConfig as _MqttBrokerConfig } from '@signage/config'

export type { _MqttBrokerConfig }

export interface DeviceRepository {
  save: (device: DeviceRecord) => Promise<void>
  findById: (deviceId: string) => Promise<DeviceRecord | null>
  findAll: () => Promise<DeviceRecord[]>
  delete: (deviceId: string) => Promise<void>
}

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

export interface PlaylistRepository {
  save: (playlist: PlaylistRecord) => Promise<void>
  findById: (id: string) => Promise<PlaylistRecord | null>
  findAll: () => Promise<PlaylistRecord[]>
  delete: (id: string) => Promise<void>
}

export interface PlaylistRecord {
  id: string
  version: string
  items: unknown[]
  loop: boolean
  updatedAt: number
}

export interface ScreenshotRepository {
  save: (metadata: ScreenshotRecord) => Promise<void>
  findById: (id: string) => Promise<ScreenshotRecord | null>
  findByDevice: (deviceId: string) => Promise<ScreenshotRecord[]>
}

export interface ScreenshotRecord {
  id: string
  deviceId: string
  commandId: string
  capturedAt: number
  storedAt: number
  path: string
  size: number
  resolution: string
  format: string
}

let deviceRepositoryInstance: DeviceRepository | null = null
let playlistRepositoryInstance: PlaylistRepository | null = null
let screenshotRepositoryInstance: ScreenshotRepository | null = null

function createDeviceRepositoryInternal(): DeviceRepository {
  throw new Error('Not implemented: createDeviceRepository')
}

function createPlaylistRepositoryInternal(): PlaylistRepository {
  throw new Error('Not implemented: createPlaylistRepository')
}

function createScreenshotRepositoryInternal(): ScreenshotRepository {
  throw new Error('Not implemented: createScreenshotRepository')
}

export function createDeviceRepository(): DeviceRepository {
  if (!deviceRepositoryInstance) {
    deviceRepositoryInstance = createDeviceRepositoryInternal()
  }
  return deviceRepositoryInstance
}

export function createPlaylistRepository(): PlaylistRepository {
  if (!playlistRepositoryInstance) {
    playlistRepositoryInstance = createPlaylistRepositoryInternal()
  }
  return playlistRepositoryInstance
}

export function createScreenshotRepository(): ScreenshotRepository {
  if (!screenshotRepositoryInstance) {
    screenshotRepositoryInstance = createScreenshotRepositoryInternal()
  }
  return screenshotRepositoryInstance
}

export function getDeviceRepository(): DeviceRepository {
  if (!deviceRepositoryInstance) {
    throw new Error('Not implemented: getDeviceRepository')
  }
  return deviceRepositoryInstance
}

export function getPlaylistRepository(): PlaylistRepository {
  if (!playlistRepositoryInstance) {
    throw new Error('Not implemented: getPlaylistRepository')
  }
  return playlistRepositoryInstance
}

export function getScreenshotRepository(): ScreenshotRepository {
  if (!screenshotRepositoryInstance) {
    throw new Error('Not implemented: getScreenshotRepository')
  }
  return screenshotRepositoryInstance
}

export function resetDeviceRepository(): void {
  deviceRepositoryInstance = null
}

export function resetPlaylistRepository(): void {
  playlistRepositoryInstance = null
}

export function resetScreenshotRepository(): void {
  screenshotRepositoryInstance = null
}
