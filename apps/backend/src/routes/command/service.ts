import type { CommandResultEnvelope } from '@signage/contracts'
import type { ServiceResponse } from '@/app/rest/rest.js'
import type { DispatchCommandRequest } from '@/routes/command/modal.js'
import { t } from '@/app/i18n/index.js'
import { messageBusService } from '@/app/message-bus/service.js'
import { ok, unexpected } from '@/app/rest/rest.js'

export interface CommandService {
  send: (request: DispatchCommandRequest) => Promise<ServiceResponse<CommandResultEnvelope>>
}

export const commandService: CommandService = {
  async send(request: DispatchCommandRequest): Promise<ServiceResponse<CommandResultEnvelope>> {
    try {
      const result = await messageBusService.send(
        request.deviceId,
        request.command,
        request.params,
        request.timeoutMs,
      )
      return ok(result)
    }
    catch (error) {
      return unexpected(error, getCommandErrorMessage(error))
    }
  },
}

function getCommandErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return t('command_dispatch_failed')
}
