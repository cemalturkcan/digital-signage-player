import type { CommandResultEnvelope, CommandType } from '@signage/contracts'
import { defineStore } from 'pinia'
import { postCommand } from '@/app/request/command'

export interface CommandsState {
  sending: boolean
  lastResult: CommandResultEnvelope | null
  error: string | null
}

export const useCommandsStore = defineStore('panel-commands', {
  state: (): CommandsState => ({
    sending: false,
    lastResult: null,
    error: null,
  }),

  actions: {
    async send(
      deviceId: string,
      command: CommandType,
      params?: Record<string, unknown>,
      timeoutMs = 10000,
    ): Promise<void> {
      this.sending = true
      this.error = null

      try {
        this.lastResult = await postCommand({
          deviceId,
          command,
          params,
          timeoutMs,
        })
      }
      catch (error) {
        this.error = error instanceof Error ? error.message : String(error)
      }
      finally {
        this.sending = false
      }
    },

    clear(): void {
      this.lastResult = null
      this.error = null
    },
  },
})
