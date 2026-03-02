import type { RegistrationResponse } from '@signage/contracts'
import type { MqttClient } from 'mqtt'
import type mqtt from 'mqtt'
import {
  connectClient,
  disconnectClient,
  getClient,
  mqttPublish,
  mqttSubscribe,
} from './base-client'

type MqttMessageHandler = (topic: string, message: Uint8Array) => void
type ConnectionChangeHandler = (connected: boolean) => void

export interface MqttClientService {
  readonly connected: boolean
  connect: (config: RegistrationResponse) => Promise<void>
  disconnect: () => Promise<void>
  publish: (topic: string, payload: unknown, qos?: 0 | 1 | 2) => Promise<void>
  subscribe: (topic: string) => Promise<void>
  onMessage: (handler: MqttMessageHandler) => void
  offMessage: (handler: MqttMessageHandler) => void
  onConnectionChange: (handler: ConnectionChangeHandler) => void
  offConnectionChange: (handler: ConnectionChangeHandler) => void
}

const RECONNECT_BASE_DELAY_MS = 1000
const RECONNECT_MAX_DELAY_MS = 30000

class MqttClientImpl implements MqttClientService {
  private desiredConnected = false
  private registration: RegistrationResponse | null = null
  private brokerUrl: string | null = null
  private readonly subscriptions = new Set<string>()
  private readonly messageHandlers = new Set<MqttMessageHandler>()
  private readonly connectionHandlers = new Set<ConnectionChangeHandler>()
  private reconnectAttempt = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private boundClient: MqttClient | null = null

  get connected(): boolean {
    return getClient()?.connected ?? false
  }

  async connect(config: RegistrationResponse): Promise<void> {
    this.desiredConnected = true
    this.registration = config
    this.brokerUrl = this.resolveBrokerUrl(config)
    this.clearReconnectTimer()

    if (this.connected)
      return

    try {
      await this.connectWithCurrentConfig()
    }
    catch (error) {
      this.scheduleReconnect()
      throw error
    }
  }

  async disconnect(): Promise<void> {
    this.desiredConnected = false
    this.reconnectAttempt = 0
    this.clearReconnectTimer()
    this.detachClientHandlers()
    await disconnectClient()
    this.emitConnectionState(false)
  }

  async publish(topic: string, payload: unknown, qos: 0 | 1 | 2 = 1): Promise<void> {
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload)
    await mqttPublish(topic, message, qos)
  }

  async subscribe(topic: string): Promise<void> {
    this.subscriptions.add(topic)
    if (this.connected)
      await mqttSubscribe(topic, 1)
  }

  onMessage(handler: MqttMessageHandler): void {
    this.messageHandlers.add(handler)
  }

  offMessage(handler: MqttMessageHandler): void {
    this.messageHandlers.delete(handler)
  }

  onConnectionChange(handler: ConnectionChangeHandler): void {
    this.connectionHandlers.add(handler)
  }

  offConnectionChange(handler: ConnectionChangeHandler): void {
    this.connectionHandlers.delete(handler)
  }

  private async connectWithCurrentConfig(): Promise<void> {
    if (!this.registration || !this.brokerUrl)
      throw new Error('MQTT config not initialized')

    await disconnectClient().catch(() => {})
    await connectClient(this.brokerUrl, this.buildOptions(this.registration))

    const client = getClient()
    if (client) {
      this.attachClientHandlers(client)
      await this.resubscribeAll()
    }

    this.reconnectAttempt = 0
  }

  private async resubscribeAll(): Promise<void> {
    for (const topic of this.subscriptions) await mqttSubscribe(topic, 1)
  }

  private attachClientHandlers(client: MqttClient): void {
    if (this.boundClient === client)
      return

    this.detachClientHandlers()

    client.on('connect', this.handleConnect)
    client.on('close', this.handleClose)
    client.on('offline', this.handleClose)
    client.on('error', this.handleClose)
    client.on('message', this.handleMessage)

    this.boundClient = client
  }

  private detachClientHandlers(): void {
    if (!this.boundClient)
      return

    this.boundClient.off('connect', this.handleConnect)
    this.boundClient.off('close', this.handleClose)
    this.boundClient.off('offline', this.handleClose)
    this.boundClient.off('error', this.handleClose)
    this.boundClient.off('message', this.handleMessage)
    this.boundClient = null
  }

  private readonly handleConnect = (): void => {
    this.reconnectAttempt = 0
    this.clearReconnectTimer()
    this.emitConnectionState(true)
    void this.resubscribeAll()
  }

  private readonly handleClose = (): void => {
    this.emitConnectionState(false)
    this.scheduleReconnect()
  }

  private readonly handleMessage = (topic: string, message: Uint8Array): void => {
    for (const handler of this.messageHandlers) handler(topic, message)
  }

  private emitConnectionState(connected: boolean): void {
    for (const handler of this.connectionHandlers) handler(connected)
  }

  private scheduleReconnect(): void {
    if (!this.desiredConnected || this.reconnectTimer)
      return

    const delay
      = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempt)
        + Math.floor(Math.random() * 400)
    this.reconnectAttempt += 1

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.reconnectWithBackoff()
    }, delay)
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer)
      return
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  private async reconnectWithBackoff(): Promise<void> {
    if (!this.desiredConnected || !this.registration)
      return

    try {
      await this.connectWithCurrentConfig()
    }
    catch {
      this.scheduleReconnect()
    }
  }

  private resolveBrokerUrl(config: RegistrationResponse): string {
    if (config.mqtt.host && config.mqtt.port) {
      const protocol = config.mqtt.ssl ? 'wss' : 'ws'
      const path = config.mqtt.path
        ? config.mqtt.path.startsWith('/')
          ? config.mqtt.path
          : `/${config.mqtt.path}`
        : ''

      return `${protocol}://${config.mqtt.host}:${config.mqtt.port}${path}`
    }

    throw new Error('MQTT broker host/port missing')
  }

  private buildOptions(config: RegistrationResponse): mqtt.IClientOptions {
    const options: mqtt.IClientOptions = {
      clientId: config.mqtt.clientId,
      keepalive: config.mqtt.keepalive,
      connectTimeout: config.mqtt.connectTimeout,
      reconnectPeriod: 0,
      clean: config.mqtt.clean,
    }

    if (config.mqtt.username)
      options.username = config.mqtt.username

    if (config.mqtt.password)
      options.password = config.mqtt.password

    if (config.mqtt.will) {
      options.will = {
        topic: config.mqtt.will.topic,
        payload: config.mqtt.will.payload,
        qos: config.mqtt.will.qos,
        retain: config.mqtt.will.retain,
      }
    }

    return options
  }
}

export const mqttClientService: MqttClientService = new MqttClientImpl()
