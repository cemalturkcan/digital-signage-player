import process from 'node:process'

export const PORT = Number(process.env.PORT ?? 3000)
export const HOST = process.env.HOST ?? '0.0.0.0'
export const NODE_ENV = process.env.NODE_ENV ?? 'development'
export const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL ?? 'mqtt://localhost:1883'
