import type { CommandResultEnvelope, CommandType } from '@signage/contracts'
import type { DispatchCommandRequest } from '@/routes/command/modal.js'
import { defaultHandler } from '@/routes/command/handlers/default.handler.js'
import { screenshotHandler } from '@/routes/command/handlers/screenshot.handler.js'

export interface ICommandResultHandler {
  readonly command: CommandType
  handle: (request: DispatchCommandRequest, result: CommandResultEnvelope) => Promise<CommandResultEnvelope>
}

export interface IFallbackHandler {
  handle: (request: DispatchCommandRequest, result: CommandResultEnvelope) => CommandResultEnvelope
}

class CommandResultHandlerRegistry {
  private readonly handlers = new Map<CommandType, ICommandResultHandler>()

  register(...handlers: ICommandResultHandler[]): this {
    for (const handler of handlers)
      this.handlers.set(handler.command, handler)
    return this
  }

  async dispatch(
    request: DispatchCommandRequest,
    result: CommandResultEnvelope,
  ): Promise<CommandResultEnvelope> {
    const handler = this.handlers.get(request.command)
    return handler
      ? handler.handle(request, result)
      : defaultHandler.handle(request, result)
  }
}

export const commandResultRegistry = new CommandResultHandlerRegistry()
  .register(screenshotHandler)
