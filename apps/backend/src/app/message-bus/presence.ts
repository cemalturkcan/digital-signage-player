import type { Buffer } from 'node:buffer'
import { logger } from '@/app/logger/logger.js'
import { busClient, mqttSubscribe } from '@/app/message-bus/base.js'
import { devicesRepository } from '@/routes/devices/repository.js'
import { statusTopicPattern } from './topics.js'

interface PresenceMessage {
  status: 'online' | 'offline'
  reason?: string
  ts?: number
}

const statusTopicRegex = /^[^/]+\/(?<deviceId>[^/]+)\/status$/

function parsePresenceMessage(payload: Buffer): PresenceMessage | null {
  let value: unknown

  try {
    value = JSON.parse(payload.toString())
  }
  catch {
    return null
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const message = value as Record<string, unknown>
  if (message.status !== 'online' && message.status !== 'offline') {
    return null
  }

  const ts = typeof message.ts === 'number' && Number.isFinite(message.ts) ? message.ts : undefined

  return {
    status: message.status,
    reason: typeof message.reason === 'string' ? message.reason : undefined,
    ts,
  }
}

class DevicePresenceTracker {
  private started = false
  private subscribed = false

  async start(): Promise<void> {
    if (this.started)
      return

    this.started = true

    busClient.on('connect', this.handleConnect)
    busClient.on('message', this.handleMessage)

    if (busClient.connected) {
      await this.ensureSubscribed()
    }
  }

  private readonly handleConnect = () => {
    this.subscribed = false
    void this.ensureSubscribed()
  }

  private readonly handleMessage = (topic: string, payload: Buffer): void => {
    const match = statusTopicRegex.exec(topic)
    if (!match?.groups?.deviceId)
      return

    const presence = parsePresenceMessage(payload)
    if (!presence)
      return

    const lastSeenAt = presence.ts ? new Date(presence.ts) : new Date()
    void devicesRepository
      .updatePresence(match.groups.deviceId, presence.status, presence.reason, lastSeenAt)
      .catch((error) => {
        logger.warn({ err: error, topic }, 'Failed to persist device presence')
      })
  }

  private async ensureSubscribed(): Promise<void> {
    if (this.subscribed || !busClient.connected)
      return

    await mqttSubscribe(statusTopicPattern(), 1)
    this.subscribed = true
  }
}

export const devicePresenceTracker = new DevicePresenceTracker()
