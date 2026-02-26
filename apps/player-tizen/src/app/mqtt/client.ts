import type { MqttClient } from 'mqtt'
import type { RegistrationResponse } from '@signage/contracts'
import { MQTT_BROKER_URL } from '@/config'
import { mqttBaseClientService } from './base-client'
import mqtt from 'mqtt'

export interface MqttClientService {
  client: MqttClient | null
  connected: boolean
  connect: (config: RegistrationResponse) => Promise<void>
  disconnect: () => Promise<void>
  publish: (topic: string, payload: unknown) => Promise<void>
  subscribe: (topic: string) => Promise<void>
}

async function connect(config: RegistrationResponse): Promise<void> {
  if (mqttClientService.client?.connected) {
    return
  }

  let brokerUrl: string
  if (config.mqtt.host && config.mqtt.port) {
    const isBrowser = typeof window !== 'undefined'
    let protocol: string
    if (isBrowser) {
      protocol = config.mqtt.ssl ? 'wss' : 'ws'
    } else {
      protocol = config.mqtt.ssl ? 'mqtts' : 'mqtt'
    }
    brokerUrl = `${protocol}://${config.mqtt.host}:${config.mqtt.port}`
  } else {
    brokerUrl = MQTT_BROKER_URL
  }

  const options: mqtt.IClientOptions = {
    clientId: config.mqtt.clientId,
    keepalive: config.mqtt.keepalive,
    connectTimeout: config.mqtt.connectTimeout,
    reconnectPeriod: config.mqtt.reconnectPeriod,
    clean: config.mqtt.clean,
  }

  if (config.mqtt.username) {
    options.username = config.mqtt.username
  }
  if (config.mqtt.password) {
    options.password = config.mqtt.password
  }

  if (config.mqtt.will) {
    options.will = {
      topic: config.mqtt.will.topic,
      payload: config.mqtt.will.payload,
      qos: config.mqtt.will.qos,
      retain: config.mqtt.will.retain,
    }
  }

  await mqttBaseClientService.connect(brokerUrl, options)

  mqttClientService.client = mqttBaseClientService.client
  mqttClientService.connected = mqttBaseClientService.connected
}

async function disconnect(): Promise<void> {
  await mqttBaseClientService.disconnect()

  mqttClientService.client = mqttBaseClientService.client
  mqttClientService.connected = mqttBaseClientService.connected
}

async function publish(topic: string, payload: unknown): Promise<void> {
  const message = typeof payload === 'string' ? payload : JSON.stringify(payload)

  await mqttBaseClientService.publish(topic, message, 1)
}

async function subscribe(topic: string): Promise<void> {
  await mqttBaseClientService.subscribe(topic, 1)
}

export const mqttClientService: MqttClientService = {
  client: null,
  connected: false,
  connect,
  disconnect,
  publish,
  subscribe,
}
