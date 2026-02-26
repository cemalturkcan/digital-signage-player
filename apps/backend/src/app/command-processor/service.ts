import type { CommandEnvelope } from '@signage/contracts'

export interface CommandProcessor {
  process: (command: CommandEnvelope) => Promise<void>
  registerHandler: (type: string, handler: CommandHandler) => void
}

export type CommandHandler = (command: CommandEnvelope) => Promise<void>

export const commandProcessor: CommandProcessor = {
  async process(command: CommandEnvelope): Promise<void> {
    void command
    throw new Error('Not implemented: process')
  },

  registerHandler(type: string, handler: CommandHandler): void {
    void type
    void handler
    throw new Error('Not implemented: registerHandler')
  },
}
