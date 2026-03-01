import type { CommandEnvelope, CommandResultEnvelope, CommandType } from '@signage/contracts'
import { messageBusAccessService } from '@/app/message-bus/access-service.js'
import { connectBus, disconnectBus } from '@/app/message-bus/base.js'
import { messageBusSendService } from '@/app/message-bus/send-service.js'

function generateCommandId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function createCommandEnvelope(
  command: CommandType,
  params?: Record<string, unknown>,
): CommandEnvelope {
  return {
    type: 'command',
    commandId: generateCommandId(),
    command,
    timestamp: Date.now(),
    params,
  }
}

export interface MessageBusService {
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  provisionDevice: (deviceId: string, username: string, password: string) => Promise<void>
  send: (
    deviceId: string,
    command: CommandType,
    params: Record<string, unknown> | undefined,
    timeoutMs: number,
  ) => Promise<CommandResultEnvelope>
}

export const messageBusService: MessageBusService = {
  connect(): Promise<void> {
    return connectBus()
  },

  disconnect(): Promise<void> {
    return disconnectBus()
  },

  provisionDevice(deviceId: string, username: string, password: string): Promise<void> {
    return messageBusAccessService.provisionDevice(deviceId, username, password)
  },

  async send(
    deviceId: string,
    command: CommandType,
    params: Record<string, unknown> | undefined,
    timeoutMs: number,
  ): Promise<CommandResultEnvelope> {
    return messageBusSendService.send(deviceId, createCommandEnvelope(command, params), timeoutMs)
  },
}
