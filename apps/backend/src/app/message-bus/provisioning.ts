import type { Buffer } from 'node:buffer'
import { logger } from '@/app/logger/logger.js'
import { busClient, generateId, mqttPublish, mqttSubscribe } from './base.js'

interface DynSecCommand {
  command: string
  correlationData?: string
  [key: string]: unknown
}

interface DynSecResponse {
  responses?: Array<{ command: string, correlationData?: string, error?: string }>
  error?: string
}

interface PendingCommand {
  resolve: (value: DynSecResponse) => void
  reject: (reason: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

const CONTROL_TOPIC = '$CONTROL/dynamic-security/v1'
const RESPONSE_TOPIC = '$CONTROL/dynamic-security/v1/response'
const COMMAND_TIMEOUT_MS = 10_000

export interface DeviceProvisioner {
  provisionDevice: (deviceId: string, username: string, password: string) => Promise<void>
}

class DynSecProvisioner implements DeviceProvisioner {
  private readonly pendingCommands = new Map<string, PendingCommand>()

  private responseTopicSubscribed = false

  constructor() {
    busClient.on('connect', () => {
      this.responseTopicSubscribed = false
      void this.ensureResponseTopicSubscription()
    })

    busClient.on('message', this.handleMessage)

    if (busClient.connected) {
      void this.ensureResponseTopicSubscription()
    }
  }

  private async ensureResponseTopicSubscription(): Promise<void> {
    if (this.responseTopicSubscribed)
      return

    await mqttSubscribe(RESPONSE_TOPIC, 1)
    this.responseTopicSubscribed = true
  }

  private handleMessage = (topic: string, payload: Buffer) => {
    if (topic !== RESPONSE_TOPIC)
      return

    try {
      const response: DynSecResponse = JSON.parse(payload.toString())
      const correlationData = response.responses?.[0]?.correlationData

      if (!correlationData)
        return

      const pending = this.pendingCommands.get(correlationData)
      if (!pending)
        return

      this.pendingCommands.delete(correlationData)
      clearTimeout(pending.timeout)
      pending.resolve(response)
    }
    catch (err) {
      logger.warn({ err, topic }, 'Failed to handle DynSec response')
    }
  }

  private waitForResponse(correlationData: string): Promise<DynSecResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingCommands.delete(correlationData)
        reject(new Error('DynSec command timeout'))
      }, COMMAND_TIMEOUT_MS)

      this.pendingCommands.set(correlationData, { resolve, reject, timeout })
    })
  }

  private async sendCommand(command: DynSecCommand): Promise<void> {
    if (!busClient.connected)
      throw new Error('Message bus not connected')

    await this.ensureResponseTopicSubscription()

    const correlationData = generateId()
    const responsePromise = this.waitForResponse(correlationData)

    try {
      await mqttPublish(CONTROL_TOPIC, JSON.stringify({ commands: [{ ...command, correlationData }] }))
    }
    catch (err) {
      const pending = this.pendingCommands.get(correlationData)
      if (pending) {
        clearTimeout(pending.timeout)
        this.pendingCommands.delete(correlationData)
      }
      throw err
    }

    const response = await responsePromise
    const cmdResponse = response.responses?.[0]

    if (cmdResponse?.error && !this.isIgnorableError(command.command, cmdResponse.error)) {
      throw new Error(cmdResponse.error)
    }
  }

  private isIgnorableError(commandName: string, message: string): boolean {
    const lower = message.toLowerCase()

    if (commandName === 'addClientRole' && lower === 'internal error')
      return true

    return lower.includes('already exists') || lower.includes('already has') || lower.includes('already in')
  }

  async provisionDevice(deviceId: string, username: string, password: string): Promise<void> {
    const roleName = `device_${deviceId}`
    const baseTopic = `signage/${deviceId}`

    await Promise.all([
      this.sendCommand({ command: 'createRole', rolename: roleName }),
      this.sendCommand({ command: 'createClient', username }),
    ])

    await Promise.all([
      this.sendCommand({
        command: 'addRoleACL',
        rolename: roleName,
        acltype: 'subscribePattern',
        topic: `${baseTopic}/commands`,
        priority: 0,
        allow: true,
      }),
      this.sendCommand({
        command: 'addRoleACL',
        rolename: roleName,
        acltype: 'publishClientSend',
        topic: `${baseTopic}/responses`,
        priority: 0,
        allow: true,
      }),
      this.sendCommand({
        command: 'addRoleACL',
        rolename: roleName,
        acltype: 'publishClientSend',
        topic: 'backend/+/responses/+',
        priority: 0,
        allow: true,
      }),
      this.sendCommand({
        command: 'addRoleACL',
        rolename: roleName,
        acltype: 'publishClientSend',
        topic: `${baseTopic}/status`,
        priority: 0,
        allow: true,
      }),
      this.sendCommand({
        command: 'addRoleACL',
        rolename: roleName,
        acltype: 'publishClientSend',
        topic: `${baseTopic}/events`,
        priority: 0,
        allow: true,
      }),
      this.sendCommand({ command: 'setClientPassword', username, password }),
    ])

    await this.sendCommand({ command: 'addClientRole', username, rolename: roleName, priority: -1 })
  }
}

export const deviceProvisioner: DeviceProvisioner = new DynSecProvisioner()
