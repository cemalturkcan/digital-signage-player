import type { MqttClient } from 'mqtt'
import mqtt from 'mqtt'
import { logger } from '@/app/logger/logger.js'
import { MQTT_HOST, MQTT_PASSWORD, MQTT_PORT, MQTT_PROTOCOL, MQTT_USERNAME } from '@/config.js'

export const BUS_BROKER_URL = `${MQTT_PROTOCOL}://${MQTT_HOST}:${MQTT_PORT}`
export const BUS_CREDENTIALS = { username: MQTT_USERNAME, password: MQTT_PASSWORD }

export const busClient: MqttClient = mqtt.connect(BUS_BROKER_URL, {
  ...BUS_CREDENTIALS,
  keepalive: 60,
  connectTimeout: 30_000,
  reconnectPeriod: 5_000,
  clean: true,
  manualConnect: true,
})

let isConnected = false

export async function connectBus(): Promise<void> {
  if (isConnected) {
    return
  }

  logger.debug({ broker: BUS_BROKER_URL }, 'Connecting to message bus')

  return new Promise((resolve, reject) => {
    function onConnect() {
      busClient.off('error', onError)
      isConnected = true
      logger.info({ broker: BUS_BROKER_URL }, 'Message bus connected')
      resolve()
    }

    function onError(err: Error) {
      busClient.off('connect', onConnect)
      logger.error({ err, broker: BUS_BROKER_URL }, 'Message bus connection failed')
      reject(err)
    }

    busClient.once('connect', onConnect)
    busClient.once('error', onError)
    busClient.connect()
  })
}

export async function disconnectBus(): Promise<void> {
  if (!isConnected) {
    return
  }

  return new Promise((resolve) => {
    busClient.end(false, {}, () => {
      isConnected = false
      logger.info({ broker: BUS_BROKER_URL }, 'Message bus disconnected')
      resolve()
    })
  })
}
