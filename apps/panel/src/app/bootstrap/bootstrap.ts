import { useDevicesStore } from '@/app/stores/devices/store'

export interface Bootstrap {
  state: BootstrapState
}

export type BootstrapState = 'idle' | 'starting' | 'ready' | 'error'

export interface BootstrapOptions {
  onStateChange?: (state: BootstrapState) => void
  onError?: (error: Error) => void
}

export async function bootstrap(options?: BootstrapOptions): Promise<Bootstrap> {
  const devicesStore = useDevicesStore()

  let state: BootstrapState = 'idle'
  const setState = (nextState: BootstrapState): void => {
    state = nextState
    options?.onStateChange?.(nextState)
  }

  try {
    setState('starting')
    await devicesStore.startPolling(1000)
    setState('ready')
    return { state }
  }
  catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    options?.onError?.(err)
    setState('error')
    return { state: 'error' }
  }
}
