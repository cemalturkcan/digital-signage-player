import type { RegistrationRequest, RegistrationResponse } from '@signage/contracts'
import { mqttClientService } from '@/app/mqtt/client'
import { postRegister } from '@/app/request/requests/register'
import { useDeviceStore } from '@/app/stores/device/store'

export interface BootstrapConfig {
  deviceId: string
}

export interface Bootstrap {
  config: BootstrapConfig
  registration: RegistrationResponse | null
  state: BootstrapState
}

export type BootstrapState
  = | 'idle'
    | 'registering'
    | 'registered'
    | 'connecting_mqtt'
    | 'connected'
    | 'error'

export interface BootstrapOptions {
  onStateChange?: (state: BootstrapState) => void
  onError?: (error: Error) => void
}

function buildRegistrationPayload(deviceId: string): RegistrationRequest {
  return {
    deviceId,
  }
}

export async function bootstrap(options?: BootstrapOptions): Promise<Bootstrap> {
  const deviceStore = useDeviceStore()

  let state: BootstrapState = 'idle'
  const setState = (newState: BootstrapState): void => {
    state = newState
    options?.onStateChange?.(newState)
  }

  const deviceId = deviceStore.getDeviceId()
  let registration: RegistrationResponse | null = null

  try {
    setState('registering')
    const payload = buildRegistrationPayload(deviceId)
    registration = await postRegister({ payload })
    deviceStore.setRegistration(registration)

    setState('registered')
  }
  catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    options?.onError?.(err)
    setState('error')
    return {
      config: {
        deviceId,
      },
      registration: null,
      state: 'error',
    }
  }

  try {
    setState('connecting_mqtt')
    await mqttClientService.connect(registration)
    setState('connected')
  }
  catch {
    setState('registered')
    return {
      config: {
        deviceId,
      },
      registration,
      state: 'registered',
    }
  }

  const config: BootstrapConfig = {
    deviceId,
  }

  return {
    config,
    registration,
    state,
  }
}
