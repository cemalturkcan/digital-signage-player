import type { PlatformAdapter } from '@/app/platform/types'
import { createBrowserPlatformAdapter } from '@/app/platform/browser/adapter'
import { createTizenPlatformAdapter } from '@/app/platform/tizen/adapter'
import { RUNTIME_NAME } from '@/config'

type RuntimeName = 'tizen' | 'web'

let singletonAdapter: PlatformAdapter | null = null

const adapterByRuntime: Record<RuntimeName, () => PlatformAdapter> = {
  tizen: createTizenPlatformAdapter,
  web: createBrowserPlatformAdapter,
}

export function createPlatformAdapter(): PlatformAdapter {
  if (singletonAdapter) {
    return singletonAdapter
  }

  const createAdapter = adapterByRuntime[RUNTIME_NAME] ?? adapterByRuntime.web
  singletonAdapter = createAdapter()

  return singletonAdapter
}
