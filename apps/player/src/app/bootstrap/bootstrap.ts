import type { RegistrationRequest, RegistrationResponse } from '@signage/contracts'
import { mqttClientService } from '@/app/mqtt/client'
import { postRegister } from '@/app/request/register'
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

const INITIAL_MQTT_CONNECT_TIMEOUT_MS = 5000

function buildRegistrationPayload(deviceId: string): RegistrationRequest {
  return {
    deviceId,
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    promise
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

export async function bootstrap(options?: BootstrapOptions): Promise<Bootstrap> {
  const deviceStore = useDeviceStore()

  let state: BootstrapState = 'idle'
  const setState = (newState: BootstrapState): void => {
    state = newState
    options?.onStateChange?.(newState)
  }

  const deviceId = deviceStore.deviceId!
  let registration: RegistrationResponse | null = deviceStore.registration

  try {
    setState('registering')
    const payload = buildRegistrationPayload(deviceId)
    registration = await postRegister({ payload })
    deviceStore.registration = registration

    setState('registered')
  }
  catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    options?.onError?.(err)

    if (!registration) {
      setState('error')
      return {
        config: {
          deviceId,
        },
        registration: null,
        state: 'error',
      }
    }

    setState('registered')
  }

  try {
    setState('connecting_mqtt')
    await withTimeout(mqttClientService.connect(registration), INITIAL_MQTT_CONNECT_TIMEOUT_MS)
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
