import type { EventEnvelope, EventType } from '@signage/contracts'
import { mqttClientService } from './client'
import { eventTopicFor } from './topics'

const HEARTBEAT_INTERVAL_MS = 30_000
const EVENT_QOS = 0 as const

class EventPublisher {
  private deviceId = ''
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null

  init(deviceId: string): void {
    this.deviceId = deviceId
  }

  async publish(event: EventType, payload?: Record<string, unknown>): Promise<void> {
    if (!this.deviceId || !mqttClientService.connected)
      return

    const envelope: EventEnvelope = {
      type: 'event',
      event,
      timestamp: Date.now(),
      ...(payload ? { payload } : {}),
    }

    try {
      await mqttClientService.publish(eventTopicFor(this.deviceId), envelope, EVENT_QOS)
    }
    catch {
      // Event publishing is best-effort — never throw
    }
  }

  publishNetworkStatus(reason: string): void {
    void this.publish('network_status', {
      reason,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      mqttConnected: mqttClientService.connected,
    })
  }

  startHeartbeat(): void {
    this.stopHeartbeat()
    this.publishNetworkStatus('heartbeat_start')
    this.heartbeatTimer = setInterval(() => {
      this.publishNetworkStatus('heartbeat')
    }, HEARTBEAT_INTERVAL_MS)
  }

  stopHeartbeat(): void {
    if (!this.heartbeatTimer)
      return
    clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = null
  }
}

export const eventPublisher = new EventPublisher()
