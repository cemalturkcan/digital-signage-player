import type { CommandEnvelope, CommandResultEnvelope, CommandType } from '@signage/contracts'
import { COMMAND_ERROR_CODES } from '@/app/commands/constants'
import { translate } from '@/app/modules/i18n'

export class CommandHandlerError extends Error {
  constructor(readonly code: string, message: string) {
    super(message)
    this.name = 'CommandHandlerError'
  }
}

export interface IPlayerCommandHandler {
  readonly command: CommandType
  handle: (envelope: CommandEnvelope) => Promise<unknown>
}

function buildSuccessResult(command: CommandEnvelope, payload?: unknown): CommandResultEnvelope {
  return {
    type: 'command_result',
    command: command.command,
    correlationId: command.commandId,
    status: 'success',
    timestamp: Date.now(),
    payload,
  }
}

function buildErrorResult(command: CommandEnvelope, code: string, message: string): CommandResultEnvelope {
  return {
    type: 'command_result',
    command: command.command,
    correlationId: command.commandId,
    status: 'error',
    timestamp: Date.now(),
    error: { code, message },
  }
}

const DEDUP_MAX_SIZE = 1000
const DEDUP_TRIM_TO = 500

class CommandHandlerRegistry {
  private readonly handlers = new Map<CommandType, IPlayerCommandHandler>()
  private readonly processedIds = new Set<string>()

  register(...handlers: IPlayerCommandHandler[]): this {
    for (const handler of handlers)
      this.handlers.set(handler.command, handler)
    return this
  }

  async execute(envelope: CommandEnvelope): Promise<CommandResultEnvelope> {
    if (this.processedIds.has(envelope.commandId))
      return buildSuccessResult(envelope, { duplicate: true })

    this.processedIds.add(envelope.commandId)
    if (this.processedIds.size > DEDUP_MAX_SIZE) {
      const oldest = Array.from(this.processedIds).slice(0, DEDUP_TRIM_TO)
      for (const id of oldest) this.processedIds.delete(id)
    }

    const handler = this.handlers.get(envelope.command)
    if (!handler) {
      return buildErrorResult(
        envelope,
        COMMAND_ERROR_CODES.UNSUPPORTED_COMMAND,
        translate('unsupportedCommand', { command: envelope.command }),
      )
    }

    try {
      const payload = await handler.handle(envelope)
      return buildSuccessResult(envelope, payload ?? undefined)
    }
    catch (error) {
      if (error instanceof CommandHandlerError)
        return buildErrorResult(envelope, error.code, error.message)

      return buildErrorResult(
        envelope,
        COMMAND_ERROR_CODES.EXECUTION_ERROR,
        error instanceof Error ? error.message : translate('unknownError'),
      )
    }
  }
}

export const playerCommandRegistry = new CommandHandlerRegistry()
