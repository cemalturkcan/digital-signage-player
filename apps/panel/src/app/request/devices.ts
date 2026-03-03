import type { ActiveDevice } from '@signage/contracts'
import { getRequest } from '@/app/modules/request'

export async function getActiveDevices(): Promise<ActiveDevice[]> {
  return getRequest<ActiveDevice[]>({
    url: '/devices/active',
  })
}
