import type { MqttClient } from 'mqtt'
import mqtt from 'mqtt'
import { t } from '@/app/i18n/index.js'
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

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export async function mqttPublish(topic: string, payload: string, qos: 0 | 1 | 2 = 1): Promise<void> {
  return new Promise((resolve, reject) => {
    busClient.publish(topic, payload, { qos }, (error) => {
      if (error)
        reject(error)
      else
        resolve()
    })
  })
}

export async function mqttSubscribe(topic: string, qos: 0 | 1 | 2 = 1): Promise<void> {
  return new Promise((resolve, reject) => {
    busClient.subscribe(topic, { qos }, (error, granted) => {
      if (error) {
        reject(error)
        return
      }

      if (!granted || granted.length === 0 || granted.every(entry => entry.qos === 128)) {
        reject(new Error(t('mqtt_subscribe_rejected')))
        return
      }

      resolve()
    })
  })
}

export async function connectBus(): Promise<void> {
  logger.debug({ broker: BUS_BROKER_URL }, 'Connecting to message bus')

  return new Promise((resolve, reject) => {
    function onConnect() {
      busClient.off('error', onError)
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
  return new Promise((resolve) => {
    busClient.end(false, {}, () => {
      logger.info({ broker: BUS_BROKER_URL }, 'Message bus disconnected')
      resolve()
    })
  })
}
