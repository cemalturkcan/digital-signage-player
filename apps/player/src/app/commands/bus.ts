import type { CommandEnvelope, CommandResultEnvelope, CommandType } from '@signage/contracts'
import { isCommandType, validateCommandEnvelope } from '@signage/contracts'

export interface CommandHandler {
  handle: (command: CommandEnvelope) => Promise<CommandResultEnvelope>
  supports: (type: string) => boolean
}

export interface CommandBus {
  register: (handler: CommandHandler) => void
  execute: (command: unknown) => Promise<CommandResultEnvelope>
}

const handlers: CommandHandler[] = []

function register(handler: CommandHandler): void {
  handlers.push(handler)
}

async function execute(envelope: unknown): Promise<CommandResultEnvelope> {
  const validation = validateCommandEnvelope(envelope)
  const now = Date.now()

  if (!validation.valid) {
    const raw = envelope as Record<string, string> | undefined
    return {
      type: 'command_result',
      command: (raw?.command as CommandType) ?? 'ping',
      correlationId: raw?.commandId ?? 'unknown',
      status: 'error',
      timestamp: now,
      error: {
        code: 'INVALID_PAYLOAD',
        message: validation.error ?? 'Command validation failed',
      },
    }
  }

  const command = envelope as CommandEnvelope

  if (!isCommandType(command.command)) {
    return {
      type: 'command_result',
      command: command.command,
      correlationId: command.commandId,
      status: 'error',
      timestamp: now,
      error: {
        code: 'UNSUPPORTED_COMMAND',
        message: `Unsupported command type: ${command.command}`,
      },
    }
  }

  const handler = handlers.find(h => h.supports(command.command))
  if (!handler) {
    return {
      type: 'command_result',
      command: command.command,
      correlationId: command.commandId,
      status: 'error',
      timestamp: now,
      error: {
        code: 'NO_HANDLER',
        message: `No handler registered for command type: ${command.command}`,
      },
    }
  }

  return handler.handle(command)
}

export const commandBus: CommandBus = {
  register,
  execute,
}
