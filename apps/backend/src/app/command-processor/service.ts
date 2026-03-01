import type { CommandEnvelope } from '@signage/contracts'
import { isCommandType, validateCommandEnvelope } from '@signage/contracts'

export interface CommandProcessor {
  process: (command: CommandEnvelope) => Promise<void>
  registerHandler: (type: string, handler: CommandHandler) => void
}

export type CommandHandler = (command: CommandEnvelope) => Promise<void>

const handlers = new Map<string, CommandHandler>()

function registerHandler(type: string, handler: CommandHandler): void {
  handlers.set(type, handler)
}

async function process(envelope: unknown): Promise<void> {
  const validation = validateCommandEnvelope(envelope)
  if (!validation.valid) {
    return
  }

  const command = envelope as CommandEnvelope
  if (!isCommandType(command.command)) {
    return
  }

  const handler = handlers.get(command.command)
  if (!handler) {
    return
  }

  await handler(command)
}

export const commandProcessor: CommandProcessor = {
  process,
  registerHandler,
}
