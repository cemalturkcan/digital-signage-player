import type { MqttClient } from 'mqtt'
import type { CommandResultEnvelope, EventEnvelope } from '@signage/contracts'
import { MQTT_HOST, MQTT_PASSWORD, MQTT_PORT, MQTT_PROTOCOL, MQTT_USERNAME } from '@/config.js'

export interface MqttService {
  client: MqttClient | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  subscribeToCommands: (deviceId: string) => Promise<void>
  unsubscribeFromCommands: (deviceId: string) => Promise<void>
  publishResult: (deviceId: string, result: CommandResultEnvelope) => Promise<void>
  publishEvent: (deviceId: string, event: EventEnvelope) => Promise<void>
}

export const MQTT_BROKER_URL = `${MQTT_PROTOCOL}://${MQTT_HOST}:${MQTT_PORT}`
export const MQTT_CREDENTIALS = { username: MQTT_USERNAME, password: MQTT_PASSWORD }

export const mqttService: MqttService = {
  client: null,

  async connect(): Promise<void> {
    void MQTT_BROKER_URL
    void MQTT_CREDENTIALS
    throw new Error('Not implemented: connect')
  },

  async disconnect(): Promise<void> {
    throw new Error('Not implemented: disconnect')
  },

  async subscribeToCommands(deviceId: string): Promise<void> {
    void deviceId
    throw new Error('Not implemented: subscribeToCommands')
  },

  async unsubscribeFromCommands(deviceId: string): Promise<void> {
    void deviceId
    throw new Error('Not implemented: unsubscribeFromCommands')
  },

  async publishResult(deviceId: string, result: CommandResultEnvelope): Promise<void> {
    void deviceId
    void result
    throw new Error('Not implemented: publishResult')
  },

  async publishEvent(deviceId: string, event: EventEnvelope): Promise<void> {
    void deviceId
    void event
    throw new Error('Not implemented: publishEvent')
  },
}
