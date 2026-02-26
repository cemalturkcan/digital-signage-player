import type { MqttClient } from 'mqtt'
import type { CommandResultEnvelope, EventEnvelope } from '@signage/contracts'
import { mqttClient, connectMqtt, disconnectMqtt } from './base-service.js'

export interface MqttService {
  client: MqttClient
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  subscribeToCommands: (deviceId: string) => Promise<void>
  unsubscribeFromCommands: (deviceId: string) => Promise<void>
  publishResult: (deviceId: string, result: CommandResultEnvelope) => Promise<void>
  publishEvent: (deviceId: string, event: EventEnvelope) => Promise<void>
}

export { MQTT_BROKER_URL, MQTT_CREDENTIALS } from './base-service.js'

const COMMANDS_TOPIC = (deviceId: string) => `devices/${deviceId}/commands`
const RESPONSES_TOPIC = (deviceId: string) => `devices/${deviceId}/responses`
const EVENTS_TOPIC = (deviceId: string) => `devices/${deviceId}/events`

async function subscribe(topic: string, qos: 0 | 1 | 2 = 0): Promise<void> {
  await mqttClient.subscribe(topic, { qos })
}

async function unsubscribe(topic: string): Promise<void> {
  await mqttClient.unsubscribe(topic)
}

async function publish(topic: string, payload: string, qos: 0 | 1 | 2 = 0): Promise<void> {
  await mqttClient.publish(topic, payload, { qos })
}

export const mqttService: MqttService = {
  get client(): MqttClient {
    return mqttClient
  },

  async connect(): Promise<void> {
    return connectMqtt()
  },

  async disconnect(): Promise<void> {
    return disconnectMqtt()
  },

  async subscribeToCommands(deviceId: string): Promise<void> {
    return subscribe(COMMANDS_TOPIC(deviceId), 1)
  },

  async unsubscribeFromCommands(deviceId: string): Promise<void> {
    return unsubscribe(COMMANDS_TOPIC(deviceId))
  },

  async publishResult(deviceId: string, result: CommandResultEnvelope): Promise<void> {
    return publish(RESPONSES_TOPIC(deviceId), JSON.stringify(result), 1)
  },

  async publishEvent(deviceId: string, event: EventEnvelope): Promise<void> {
    return publish(EVENTS_TOPIC(deviceId), JSON.stringify(event), 0)
  },
}
