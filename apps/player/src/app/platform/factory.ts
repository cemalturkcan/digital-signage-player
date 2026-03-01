import type { PlatformAdapter } from '@/app/platform/types'
import { createBrowserPlatformAdapter } from '@/app/platform/browser/adapter'
import { createTizenPlatformAdapter } from '@/app/platform/tizen/adapter'

type RuntimeName = 'tizen' | 'web'

let singletonAdapter: PlatformAdapter | null = null

const adapterByRuntime: Record<RuntimeName, () => PlatformAdapter> = {
  tizen: createTizenPlatformAdapter,
  web: createBrowserPlatformAdapter,
}

function resolveRuntimeName(): RuntimeName {
  if (import.meta.env.MODE === 'tizen') {
    return 'tizen'
  }
  if (typeof window === 'undefined') {
    return 'web'
  }
  return 'tizen' in window ? 'tizen' : 'web'
}

export function createPlatformAdapter(): PlatformAdapter {
  if (singletonAdapter) {
    return singletonAdapter
  }

  const runtime = resolveRuntimeName()
  const createAdapter = adapterByRuntime[runtime] ?? adapterByRuntime.web
  singletonAdapter = createAdapter()

  return singletonAdapter
}
