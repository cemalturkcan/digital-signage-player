import mqtt from 'mqtt'
import type { MqttClient } from 'mqtt'
import { MQTT_HOST, MQTT_PASSWORD, MQTT_PORT, MQTT_PROTOCOL, MQTT_USERNAME } from '@/config.js'
import { logger } from '@/app/logger/logger.js'

export const MQTT_BROKER_URL = `${MQTT_PROTOCOL}://${MQTT_HOST}:${MQTT_PORT}`
export const MQTT_CREDENTIALS = { username: MQTT_USERNAME, password: MQTT_PASSWORD }

export const mqttClient: MqttClient = mqtt.connect(MQTT_BROKER_URL, {
  ...MQTT_CREDENTIALS,
  keepalive: 60,
  connectTimeout: 30_000,
  reconnectPeriod: 5_000,
  clean: true,
  manualConnect: true,
})

let isConnected = false

export async function connectMqtt(): Promise<void> {
  if (isConnected) {
    return
  }

  logger.debug({ broker: MQTT_BROKER_URL }, 'Connecting to MQTT broker')

  return new Promise((resolve, reject) => {
    const onConnect = () => {
      mqttClient.off('error', onError)
      isConnected = true
      logger.info({ broker: MQTT_BROKER_URL }, 'MQTT connected')
      resolve()
    }

    const onError = (err: Error) => {
      mqttClient.off('connect', onConnect)
      logger.error({ err, broker: MQTT_BROKER_URL }, 'MQTT connection failed')
      reject(err)
    }

    mqttClient.once('connect', onConnect)
    mqttClient.once('error', onError)
    mqttClient.connect()
  })
}

export async function disconnectMqtt(): Promise<void> {
  if (!isConnected) {
    return
  }

  return new Promise((resolve) => {
    mqttClient.end(false, {}, () => {
      isConnected = false
      logger.info({ broker: MQTT_BROKER_URL }, 'MQTT disconnected')
      resolve()
    })
  })
}
