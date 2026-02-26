import type { MqttClient } from 'mqtt'
import type { CommandResultEnvelope, EventEnvelope } from '@signage/contracts'

export interface MqttService {
  client: MqttClient | null
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  subscribeToCommands: (deviceId: string) => Promise<void>
  unsubscribeFromCommands: (deviceId: string) => Promise<void>
  publishResult: (deviceId: string, result: CommandResultEnvelope) => Promise<void>
  publishEvent: (deviceId: string, event: EventEnvelope) => Promise<void>
}

export const mqttService: MqttService = {
  client: null,

  async connect(): Promise<void> {
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
