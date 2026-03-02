import process from 'node:process'
import 'dotenv/config'

export const PORT = Number(process.env.PORT ?? 3000)
export const HOST = process.env.HOST
export const NODE_ENV = process.env.NODE_ENV

const validProtocols = ['mqtt', 'mqtts', 'ws', 'wss'] as const
type MqttProtocol = (typeof validProtocols)[number]
export const MQTT_PROTOCOL: MqttProtocol = (process.env.MQTT_PROTOCOL as MqttProtocol) ?? 'mqtt'
export const MQTT_HOST = process.env.MQTT_HOST ?? 'localhost'
export const MQTT_PORT = Number(process.env.MQTT_PORT ?? 1883)
export const MQTT_USERNAME = process.env.MQTT_USERNAME ?? ''
export const MQTT_PASSWORD = process.env.MQTT_PASSWORD ?? ''
export const MQTT_TOPIC_NAMESPACE = process.env.MQTT_TOPIC_NAMESPACE ?? 'players'

if (!validProtocols.includes(MQTT_PROTOCOL)) {
  throw new Error(
    `Invalid MQTT_PROTOCOL: ${MQTT_PROTOCOL}. Valid protocols: ${validProtocols.join(', ')}`
  )
}

export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'

export const MQTT_SSL = MQTT_PROTOCOL === 'mqtts' || MQTT_PROTOCOL === 'wss'

export const MQTT_CLIENT_HOST = process.env.MQTT_CLIENT_HOST ?? MQTT_HOST
export const MQTT_CLIENT_PORT = Number(process.env.MQTT_CLIENT_PORT ?? 9001)
export const MQTT_CLIENT_SSL = process.env.MQTT_CLIENT_SSL === 'true' || MQTT_SSL
export const MQTT_CLIENT_PATH = process.env.MQTT_CLIENT_PATH ?? ''

export const DB_HOST = process.env.DB_HOST
export const DB_PORT = Number(process.env.DB_PORT)
export const DB_NAME = process.env.DB_NAME
export const DB_USER = process.env.DB_USER
export const DB_PASSWORD = process.env.DB_PASSWORD

export const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info'
export const LOG_PRETTY = process.env.LOG_PRETTY === 'true'

const DEFAULT_CORS_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']
export const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : DEFAULT_CORS_ORIGINS
