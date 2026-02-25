import type { MqttClient } from 'mqtt'
import type {
  CommandResultEnvelope,
  EventEnvelope,
  CommandEnvelope as _CommandEnvelope,
} from '@signage/contracts'

export type { _CommandEnvelope }

export interface MqttService {
  client: MqttClient | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  subscribeToCommands: (deviceId: string) => Promise<void>
  unsubscribeFromCommands: (deviceId: string) => Promise<void>
  publishResult: (deviceId: string, result: CommandResultEnvelope) => Promise<void>
  publishEvent: (deviceId: string, event: EventEnvelope) => Promise<void>
}

let mqttServiceInstance: MqttService | null = null

function createMqttServiceInternal(): MqttService {
  throw new Error('Not implemented: createMqttService')
}

export function createMqttService(): MqttService {
  if (!mqttServiceInstance) {
    mqttServiceInstance = createMqttServiceInternal()
  }
  return mqttServiceInstance
}

export function getMqttService(): MqttService {
  if (!mqttServiceInstance) {
    throw new Error('Not implemented: getMqttService')
  }
  return mqttServiceInstance
}

export function resetMqttService(): void {
  mqttServiceInstance = null
}
