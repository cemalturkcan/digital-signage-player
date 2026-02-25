import type { CommandEnvelope, CommandResultEnvelope } from '@signage/contracts'

export interface CommandHandler {
  handle: (command: CommandEnvelope) => Promise<CommandResultEnvelope>
  supports: (type: string) => boolean
}

export interface CommandBus {
  register: (handler: CommandHandler) => void
  execute: (command: CommandEnvelope) => Promise<CommandResultEnvelope>
}

let commandBusInstance: CommandBus | null = null

function createCommandBusInternal(): CommandBus {
  throw new Error('Not implemented: createCommandBus')
}

export function createCommandBus(): CommandBus {
  if (!commandBusInstance) {
    commandBusInstance = createCommandBusInternal()
  }
  return commandBusInstance
}

export function getCommandBus(): CommandBus {
  if (!commandBusInstance) {
    throw new Error('Not implemented: getCommandBus')
  }
  return commandBusInstance
}

export function resetCommandBus(): void {
  commandBusInstance = null
}
