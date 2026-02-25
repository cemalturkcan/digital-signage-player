import type { MqttClient } from 'mqtt'
import type { RegistrationResponse } from '@signage/contracts'

export interface MqttClientService {
  client: MqttClient | null
  connected: boolean
  connect: (config: RegistrationResponse) => Promise<void>
  disconnect: () => Promise<void>
  publish: (topic: string, payload: unknown) => Promise<void>
  subscribe: (topic: string) => Promise<void>
}

class MqttClientServiceImpl implements MqttClientService {
  client: MqttClient | null = null
  connected = false

  async connect(_config: RegistrationResponse): Promise<void> {
    throw new Error('Not implemented: connect')
  }

  async disconnect(): Promise<void> {
    throw new Error('Not implemented: disconnect')
  }

  async publish(_topic: string, _payload: unknown): Promise<void> {
    throw new Error('Not implemented: publish')
  }

  async subscribe(_topic: string): Promise<void> {
    throw new Error('Not implemented: subscribe')
  }
}

let mqttClientInstance: MqttClientService | null = null

export function getMqttClientService(): MqttClientService {
  if (!mqttClientInstance) {
    mqttClientInstance = new MqttClientServiceImpl()
  }
  return mqttClientInstance
}

export function resetMqttClientService(): void {
  mqttClientInstance = null
}
