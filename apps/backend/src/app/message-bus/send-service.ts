import type { CommandEnvelope, CommandResultEnvelope } from '@signage/contracts'
import type { MqttClient } from 'mqtt'
import type { Buffer } from 'node:buffer'
import process from 'node:process'
import { t } from '@/app/i18n/index.js'
import { busClient } from './base.js'

interface PendingCommand {
  replyTopic: string
  resolve: (result: CommandResultEnvelope) => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

const BACKEND_INSTANCE_ID = `${process.pid}-${Math.random().toString(36).slice(2, 10)}`

function getReplyTopicRoot(): string {
  return `backend/${BACKEND_INSTANCE_ID}/responses`
}

function getReplyTopic(commandId: string): string {
  return `${getReplyTopicRoot()}/${commandId}`
}

function getCommandTopic(deviceId: string): string {
  return `signage/${deviceId}/commands`
}

function isCommandResultEnvelope(value: unknown): value is CommandResultEnvelope {
  if (!value || typeof value !== 'object') {
    return false
  }

  const envelope = value as Record<string, unknown>

  if (envelope.type !== 'command_result') {
    return false
  }

  if (typeof envelope.correlationId !== 'string' || envelope.correlationId.trim().length === 0) {
    return false
  }

  if (envelope.status !== 'success' && envelope.status !== 'error') {
    return false
  }

  return true
}

async function subscribeWithCallback(client: MqttClient, topic: string): Promise<void> {
  return new Promise((resolve, reject) => {
    client.subscribe(topic, { qos: 1 }, (error, granted) => {
      if (error) {
        reject(error)
        return
      }

      if (!granted || granted.length === 0 || granted.every(entry => entry.qos === 128)) {
        reject(new Error(t('mqtt_subscribe_rejected')))
        return
      }

      resolve()
    })
  })
}

async function publishWithCallback(
  client: MqttClient,
  topic: string,
  payload: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    client.publish(topic, payload, { qos: 1 }, (error) => {
      if (error) {
        reject(error)
      }
      else {
        resolve()
      }
    })
  })
}

class MessageBusSendServiceImpl {
  private readonly pendingCommands = new Map<string, PendingCommand>()

  private subscribedReplyRoot = false

  constructor(private readonly client: MqttClient) {
    this.client.on('connect', () => {
      this.subscribedReplyRoot = false
    })

    this.client.on('message', this.handleMessage)
  }

  private handleMessage = (topic: string, payload: Buffer) => {
    let parsed: unknown

    try {
      parsed = JSON.parse(payload.toString())
    }
    catch {
      return
    }

    if (!isCommandResultEnvelope(parsed)) {
      return
    }

    const pending = this.pendingCommands.get(parsed.correlationId)
    if (!pending) {
      return
    }

    if (topic !== pending.replyTopic) {
      return
    }

    this.pendingCommands.delete(parsed.correlationId)
    clearTimeout(pending.timeout)

    if (parsed.status === 'success') {
      pending.resolve(parsed)
      return
    }

    const message = parsed.error?.message ?? t('command_execution_failed_on_device')
    pending.reject(new Error(message))
  }

  private async ensureReplySubscription(): Promise<void> {
    if (this.subscribedReplyRoot) {
      return
    }

    const replyRoot = `${getReplyTopicRoot()}/#`
    await subscribeWithCallback(this.client, replyRoot)
    this.subscribedReplyRoot = true
  }

  private async publishCommand(deviceId: string, command: CommandEnvelope): Promise<void> {
    await publishWithCallback(this.client, getCommandTopic(deviceId), JSON.stringify(command))
  }

  private waitForResponse(
    commandId: string,
    replyTopic: string,
    timeoutMs: number,
  ): Promise<CommandResultEnvelope> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(commandId)
        reject(new Error(t('command_response_timeout', { timeoutMs })))
      }, timeoutMs)

      this.pendingCommands.set(commandId, {
        replyTopic,
        resolve,
        reject,
        timeout,
      })
    })
  }

  async dispatch(
    deviceId: string,
    command: CommandEnvelope,
    timeoutMs: number,
  ): Promise<CommandResultEnvelope> {
    if (!this.client.connected) {
      throw new Error(t('mqtt_client_not_connected'))
    }

    await this.ensureReplySubscription()

    const replyTopic = getReplyTopic(command.commandId)

    const commandWithReply: CommandEnvelope = {
      ...command,
      replyTopic,
    }

    const responsePromise = this.waitForResponse(command.commandId, replyTopic, timeoutMs)

    try {
      await this.publishCommand(deviceId, commandWithReply)
    }
    catch (error) {
      const pending = this.pendingCommands.get(command.commandId)
      if (pending) {
        this.pendingCommands.delete(command.commandId)
        clearTimeout(pending.timeout)
      }
      throw error
    }

    return responsePromise
  }
}

export interface MessageBusSendService {
  send: (
    deviceId: string,
    command: CommandEnvelope,
    timeoutMs: number,
  ) => Promise<CommandResultEnvelope>
}

const internalService = new MessageBusSendServiceImpl(busClient)

export const messageBusSendService: MessageBusSendService = {
  send(
    deviceId: string,
    command: CommandEnvelope,
    timeoutMs: number,
  ): Promise<CommandResultEnvelope> {
    return internalService.dispatch(deviceId, command, timeoutMs)
  },
}
