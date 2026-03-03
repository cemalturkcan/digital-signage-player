import type { CommandEnvelope, CommandResultEnvelope, CommandType } from '@signage/contracts'
import { connectBus, disconnectBus, generateId } from '@/app/message-bus/base.js'
import { commandDispatcher } from '@/app/message-bus/dispatcher.js'
import { devicePresenceTracker } from '@/app/message-bus/presence.js'
import { deviceProvisioner } from '@/app/message-bus/provisioning.js'

function createCommandEnvelope(
  command: CommandType,
  params?: Record<string, unknown>,
): CommandEnvelope {
  return {
    type: 'command',
    commandId: generateId(),
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
  async connect(): Promise<void> {
    await devicePresenceTracker.start()
    await connectBus()
  },
  disconnect: disconnectBus,

  provisionDevice(deviceId: string, username: string, password: string): Promise<void> {
    return deviceProvisioner.provisionDevice(deviceId, username, password)
  },

  send(
    deviceId: string,
    command: CommandType,
    params: Record<string, unknown> | undefined,
    timeoutMs: number,
  ): Promise<CommandResultEnvelope> {
    return commandDispatcher.dispatch(deviceId, createCommandEnvelope(command, params), timeoutMs)
  },
}
