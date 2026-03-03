import type { CommandResultEnvelope, CommandType } from '@signage/contracts'
import { postRequest } from '@/app/modules/request'

export interface DispatchCommandRequest {
  deviceId: string
  command: CommandType
  params?: Record<string, unknown>
  timeoutMs?: number
}

export async function postCommand(payload: DispatchCommandRequest): Promise<CommandResultEnvelope> {
  return postRequest<CommandResultEnvelope>({
    url: '/commands',
    payload,
  })
}
