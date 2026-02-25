import type { MqttClient as _MqttClient } from 'mqtt'
import type { CommandEnvelope } from '@signage/contracts'

export type { _MqttClient }

export interface CommandProcessor {
  process: (command: CommandEnvelope) => Promise<void>
  registerHandler: (type: string, handler: CommandHandler) => void
}

export type CommandHandler = (command: CommandEnvelope) => Promise<void>

let commandProcessorInstance: CommandProcessor | null = null

function createCommandProcessorInternal(): CommandProcessor {
  throw new Error('Not implemented: createCommandProcessor')
}

export function createCommandProcessor(): CommandProcessor {
  if (!commandProcessorInstance) {
    commandProcessorInstance = createCommandProcessorInternal()
  }
  return commandProcessorInstance
}

export function getCommandProcessor(): CommandProcessor {
  if (!commandProcessorInstance) {
    throw new Error('Not implemented: getCommandProcessor')
  }
  return commandProcessorInstance
}

export function resetCommandProcessor(): void {
  commandProcessorInstance = null
}
