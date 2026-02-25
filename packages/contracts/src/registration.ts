export interface RegistrationRequest {
  deviceId: string
  deviceType: DeviceType
  deviceInfo?: Record<string, unknown>
  softwareVersion: string
  capabilities: DeviceCapabilities
}

export type DeviceType = 'tizen' | 'webos' | 'web'

export interface DeviceCapabilities {
  screenshot: boolean
  videoCodecs: string[]
  maxResolution: string
  storageQuota?: number
}

export interface RegistrationResponse {
  deviceId: string
  orgId: string
  locationId: string
  mqtt: MqttConnectionConfig
  topics: MqttTopics
  apiBaseUrl: string
  registeredAt: number
  authToken?: string
}

export interface MqttConnectionConfig {
  host: string
  port: number
  ssl: boolean
  clientId: string
  keepalive: number
  connectTimeout: number
  reconnectPeriod: number
  clean: boolean
  will?: MqttWillConfig
}

export interface MqttWillConfig {
  topic: string
  payload: string
  qos: 0 | 1 | 2
  retain: boolean
}

export interface MqttTopics {
  base: string
  commands: string
  responses: string
  status: string
  events: string
}
