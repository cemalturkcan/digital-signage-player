import type { PlayerConfig } from '@signage/config'
import type { MqttConnectionConfig, RegistrationResponse } from '@signage/contracts'

export interface Bootstrap {
  config: PlayerConfig
  registration: RegistrationResponse | null
  state: BootstrapState
}

export type BootstrapState =
  | 'idle'
  | 'registering'
  | 'registered'
  | 'connecting_mqtt'
  | 'connected'
  | 'error'

export async function bootstrap(): Promise<Bootstrap> {
  throw new Error('Not implemented: bootstrap')
}

export async function registerWithBackend(_config: PlayerConfig): Promise<RegistrationResponse> {
  throw new Error('Not implemented: registerWithBackend')
}

export function initializeMqtt(
  _config: MqttConnectionConfig,
  _topics: { commands: string },
): unknown {
  throw new Error('Not implemented: initializeMqtt')
}
