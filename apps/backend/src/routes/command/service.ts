import type { CommandResultEnvelope } from '@signage/contracts'
import type { ServiceResponse } from '@/app/rest/rest.js'
import type { DispatchCommandRequest } from '@/routes/command/modal.js'
import { t } from '@/app/i18n/index.js'
import { messageBusService } from '@/app/message-bus/service.js'
import { ok, unexpected } from '@/app/rest/rest.js'
import { commandResultRegistry } from '@/routes/command/handler-registry.js'

export interface CommandService {
  send: (request: DispatchCommandRequest) => Promise<ServiceResponse<CommandResultEnvelope>>
}

export const commandService: CommandService = {
  async send(request: DispatchCommandRequest): Promise<ServiceResponse<CommandResultEnvelope>> {
    try {
      const timeoutMs
        = request.command === 'screenshot' ? Math.max(request.timeoutMs, 20000) : request.timeoutMs

      const commandResult = await messageBusService.send(
        request.deviceId,
        request.command,
        request.params,
        timeoutMs,
      )

      const result = await commandResultRegistry.dispatch(request, commandResult)
      return ok(result)
    }
    catch (error) {
      return unexpected(
        error,
        error instanceof Error ? error.message : t('command_dispatch_failed'),
      )
    }
  },
}
