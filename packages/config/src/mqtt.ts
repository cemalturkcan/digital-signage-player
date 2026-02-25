export interface MqttBrokerConfig {
  host: string
  port: number
  ssl: boolean
  wsPort?: number
  auth: MqttAuthConfig
  persistence: MqttPersistenceConfig
}

export interface MqttAuthConfig {
  enabled: boolean
  jwtSecret?: string
  allowAnonymous: boolean
}

export interface MqttPersistenceConfig {
  type: 'memory' | 'level' | 'redis'
  path?: string
  redisUrl?: string
}

export function loadMqttBrokerConfig(): MqttBrokerConfig {
  throw new Error('Not implemented: loadMqttBrokerConfig')
}
