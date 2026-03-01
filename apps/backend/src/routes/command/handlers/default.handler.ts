import type { CommandResultEnvelope } from '@signage/contracts'
import type { IFallbackHandler } from '@/routes/command/handler-registry.js'
import type { DispatchCommandRequest } from '@/routes/command/modal.js'
import { logger } from '@/app/logger/logger.js'

export const defaultHandler: IFallbackHandler = {
  handle(request: DispatchCommandRequest, result: CommandResultEnvelope): CommandResultEnvelope {
    logger.info(
      { deviceId: request.deviceId, command: request.command, status: result.status },
      'Command result received',
    )
    return result
  },
}
