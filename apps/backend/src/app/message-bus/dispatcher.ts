import type { CommandEnvelope, CommandResultEnvelope } from '@signage/contracts'
import type { Buffer } from 'node:buffer'
import process from 'node:process'
import { t } from '@/app/i18n/index.js'
import { busClient, mqttPublish, mqttSubscribe } from './base.js'

interface PendingCommand {
  replyTopic: string
  resolve: (result: CommandResultEnvelope) => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

const BACKEND_INSTANCE_ID = `${process.pid}-${Math.random().toString(36).slice(2, 10)}`

function replyTopicRoot(): string {
  return `backend/${BACKEND_INSTANCE_ID}/responses`
}

function replyTopicFor(commandId: string): string {
  return `${replyTopicRoot()}/${commandId}`
}

function commandTopicFor(deviceId: string): string {
  return `signage/${deviceId}/commands`
}

function isCommandResultEnvelope(value: unknown): value is CommandResultEnvelope {
  if (!value || typeof value !== 'object')
    return false

  const v = value as Record<string, unknown>

  return (
    v.type === 'command_result'
    && typeof v.correlationId === 'string'
    && v.correlationId.trim().length > 0
    && (v.status === 'success' || v.status === 'error')
  )
}

export interface CommandDispatcher {
  dispatch: (deviceId: string, command: CommandEnvelope, timeoutMs: number) => Promise<CommandResultEnvelope>
}

class CommandDispatcherImpl implements CommandDispatcher {
  private readonly pending = new Map<string, PendingCommand>()

  private subscribedReplyRoot = false

  constructor() {
    busClient.on('connect', () => {
      this.subscribedReplyRoot = false
    })

    busClient.on('message', this.handleMessage)
  }

  private handleMessage = (topic: string, payload: Buffer) => {
    let parsed: unknown

    try {
      parsed = JSON.parse(payload.toString())
    }
    catch {
      return
    }

    if (!isCommandResultEnvelope(parsed))
      return

    const entry = this.pending.get(parsed.correlationId)
    if (!entry || topic !== entry.replyTopic)
      return

    this.pending.delete(parsed.correlationId)
    clearTimeout(entry.timeout)

    if (parsed.status === 'success') {
      entry.resolve(parsed)
    }
    else {
      entry.reject(new Error(parsed.error?.message ?? t('command_execution_failed_on_device')))
    }
  }

  private async ensureReplySubscription(): Promise<void> {
    if (this.subscribedReplyRoot)
      return

    await mqttSubscribe(`${replyTopicRoot()}/#`)
    this.subscribedReplyRoot = true
  }

  private waitForResponse(commandId: string, replyTopic: string, timeoutMs: number): Promise<CommandResultEnvelope> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(commandId)
        reject(new Error(t('command_response_timeout', { timeoutMs })))
      }, timeoutMs)

      this.pending.set(commandId, { replyTopic, resolve, reject, timeout })
    })
  }

  async dispatch(deviceId: string, command: CommandEnvelope, timeoutMs: number): Promise<CommandResultEnvelope> {
    if (!busClient.connected)
      throw new Error(t('mqtt_client_not_connected'))

    await this.ensureReplySubscription()

    const replyTopic = replyTopicFor(command.commandId)
    const responsePromise = this.waitForResponse(command.commandId, replyTopic, timeoutMs)

    try {
      await mqttPublish(commandTopicFor(deviceId), JSON.stringify({ ...command, replyTopic }))
    }
    catch (error) {
      const entry = this.pending.get(command.commandId)
      if (entry) {
        clearTimeout(entry.timeout)
        this.pending.delete(command.commandId)
      }
      throw error
    }

    return responsePromise
  }
}

export const commandDispatcher: CommandDispatcher = new CommandDispatcherImpl()
