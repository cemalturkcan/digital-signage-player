import type { CommandEnvelope, CommandResultEnvelope } from '@signage/contracts'

export interface CommandHandler {
  handle: (command: CommandEnvelope) => Promise<CommandResultEnvelope>
  supports: (type: string) => boolean
}

export interface CommandBus {
  register: (handler: CommandHandler) => void
  execute: (command: CommandEnvelope) => Promise<CommandResultEnvelope>
}

const handlers: CommandHandler[] = []

function register(handler: CommandHandler): void {
  handlers.push(handler)
}

async function execute(command: CommandEnvelope): Promise<CommandResultEnvelope> {
  const handler = handlers.find(h => h.supports(command.command))
  if (!handler) {
    const now = Date.now()
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
