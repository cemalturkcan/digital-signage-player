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

async function connect(config: RegistrationResponse): Promise<void> {
  void config
  throw new Error('Not implemented: connect')
}

async function disconnect(): Promise<void> {
  throw new Error('Not implemented: disconnect')
}

async function publish(topic: string, payload: unknown): Promise<void> {
  void topic
  void payload
  throw new Error('Not implemented: publish')
}

async function subscribe(topic: string): Promise<void> {
  void topic
  throw new Error('Not implemented: subscribe')
}

export const mqttClientService: MqttClientService = {
  client: null,
  connected: false,
  connect,
  disconnect,
  publish,
  subscribe,
}
