export interface RegistrationRequest {
  deviceId: string
  deviceInfo?: Record<string, unknown>
  capabilities?: DeviceCapabilities
}

export interface DeviceCapabilities {
  screenshot: boolean
  videoCodecs: string[]
  maxResolution: string
  storageQuota?: number
}

export interface RegistrationResponse {
  mqtt: MqttConnectionConfig
}

export interface MqttConnectionConfig {
  host: string
  port: number
  ssl: boolean
  clientId: string
  username: string
  password: string
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
