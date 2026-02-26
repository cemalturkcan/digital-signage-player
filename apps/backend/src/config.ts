import process from 'node:process'

export const PORT = Number(process.env.PORT ?? 3000)
export const HOST = process.env.HOST ?? '0.0.0.0'
export const NODE_ENV = process.env.NODE_ENV ?? 'development'
export const MQTT_PROTOCOL = process.env.MQTT_PROTOCOL ?? 'mqtt'
export const MQTT_HOST = process.env.MQTT_HOST ?? 'localhost'
export const MQTT_PORT = Number(process.env.MQTT_PORT ?? 1883)
export const MQTT_USERNAME = process.env.MQTT_USERNAME ?? ''
export const MQTT_PASSWORD = process.env.MQTT_PASSWORD ?? ''
