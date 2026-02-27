import type { MqttClient } from 'mqtt'
import type { Buffer } from 'node:buffer'
import { logger } from '@/app/logger/logger.js'
import { mqttClient } from './base-service.js'

interface DynSecCommand {
  command: string
  correlationData?: string
  [key: string]: unknown
}

interface DynSecResponse {
  responses?: Array<{ command: string, correlationData?: string, error?: string }>
  error?: string
}

const CONTROL_TOPIC = '$CONTROL/dynamic-security/v1'
const RESPONSE_TOPIC = '$CONTROL/dynamic-security/v1/response'
const COMMAND_TIMEOUT_MS = 10_000

function generateCommandId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export interface MqttProvisioningService {
  provisionDevice: (deviceId: string, username: string, password: string) => Promise<void>
}

interface PendingCommand {
  resolve: (value: DynSecResponse) => void
  reject: (reason: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

async function publishWithCallback(
  client: MqttClient,
  topic: string,
  payload: string,
  qos: 0 | 1 | 2 = 1,
): Promise<void> {
  return new Promise((resolve, reject) => {
    client.publish(topic, payload, { qos }, (err) => {
      if (err) {
        reject(err)
      }
      else {
        resolve()
      }
    })
  })
}

class MqttProvisioningServiceImpl implements MqttProvisioningService {
  private pendingCommands = new Map<string, PendingCommand>()

  private client: MqttClient

  constructor() {
    this.client = mqttClient

    this.client.on('connect', () => {
      this.client.subscribe(RESPONSE_TOPIC, { qos: 1 })
    })

    this.client.on('message', this.handleMessage)
  }

  private handleMessage = (topic: string, payload: Buffer) => {
    if (topic !== RESPONSE_TOPIC)
      return

    try {
      const response: DynSecResponse = JSON.parse(payload.toString())
      const correlationData = response.responses?.[0]?.correlationData
      if (correlationData) {
        const pending = this.pendingCommands.get(correlationData)
        if (pending) {
          this.pendingCommands.delete(correlationData)
          clearTimeout(pending.timeout)
          pending.resolve(response)
        }
      }
    }
    catch (err) {
      logger.warn({ err, topic }, 'Failed to handle MQTT response message')
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
    if (!this.client.connected) {
      throw new Error('MQTT client not connected')
    }

    const correlationData = generateCommandId()
    const responsePromise = this.waitForResponse(correlationData)

    const payload = JSON.stringify({
      commands: [{ ...command, correlationData }],
    })

    try {
      await publishWithCallback(this.client, CONTROL_TOPIC, payload, 1)
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
    if (cmdResponse?.error) {
      if (cmdResponse.error.includes('already exists')) {
        return
      }
      throw new Error(cmdResponse.error)
    }
  }

  async provisionDevice(deviceId: string, username: string, password: string): Promise<void> {
    const roleName = `device_${deviceId}`
    const baseTopic = `signage/${deviceId}`

    await this.sendCommand({
      command: 'createRole',
      rolename: roleName,
    })

    await this.sendCommand({
      command: 'addRoleACL',
      rolename: roleName,
      acltype: 'subscribePattern',
      topic: `${baseTopic}/commands`,
      priority: 0,
      allow: true,
    })

    await this.sendCommand({
      command: 'addRoleACL',
      rolename: roleName,
      acltype: 'publishClientSend',
      topic: `${baseTopic}/responses`,
      priority: 0,
      allow: true,
    })

    await this.sendCommand({
      command: 'addRoleACL',
      rolename: roleName,
      acltype: 'publishClientSend',
      topic: `${baseTopic}/status`,
      priority: 0,
      allow: true,
    })

    await this.sendCommand({
      command: 'addRoleACL',
      rolename: roleName,
      acltype: 'publishClientSend',
      topic: `${baseTopic}/events`,
      priority: 0,
      allow: true,
    })

    await this.sendCommand({
      command: 'createClient',
      username,
    })

    await this.sendCommand({
      command: 'setClientPassword',
      username,
      password,
    })

    await this.sendCommand({
      command: 'addClientRole',
      username,
      rolename: roleName,
      priority: -1,
    })
  }
}

export const mqttProvisioningService: MqttProvisioningService = new MqttProvisioningServiceImpl()
