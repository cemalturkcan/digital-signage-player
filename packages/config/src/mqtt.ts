declare const process: { env: Record<string, string | undefined> }

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

function parseString(val: string | undefined, def: string): string {
  return val ?? def
}

function parseNumber(val: string | undefined, def: number): number {
  if (!val)
    return def
  const n = Number(val)
  return Number.isNaN(n) ? def : n
}

function parseBool(val: string | undefined, def: boolean): boolean {
  if (!val)
    return def
  return val === 'true' || val === '1'
}

function parsePersistenceType(val: string | undefined): 'memory' | 'level' | 'redis' {
  if (val === 'level' || val === 'redis')
    return val
  return 'memory'
}

export function loadMqttBrokerConfig(): MqttBrokerConfig {
  return {
    host: parseString(process.env.MQTT_HOST, '0.0.0.0'),
    port: parseNumber(process.env.MQTT_PORT, 1883),
    ssl: parseBool(process.env.MQTT_SSL, false),
    wsPort: process.env.MQTT_WS_PORT
      ? parseNumber(process.env.MQTT_WS_PORT, 8080)
      : undefined,
    auth: {
      enabled: parseBool(process.env.MQTT_AUTH_ENABLED, false),
      jwtSecret: process.env.MQTT_JWT_SECRET,
      allowAnonymous: parseBool(process.env.MQTT_ALLOW_ANONYMOUS, true),
    },
    persistence: {
      type: parsePersistenceType(process.env.MQTT_PERSISTENCE_TYPE),
      path: process.env.MQTT_PERSISTENCE_PATH,
      redisUrl: process.env.MQTT_REDIS_URL,
    },
  }
}
