import type { RegistrationResponse } from '@signage/contracts'
import type { MqttClient } from 'mqtt'
import type mqtt from 'mqtt'
import { MQTT_BROKER_URL } from '@/config'
import { mqttBaseClientService } from './base-client'

type MqttMessageHandler = (topic: string, message: Uint8Array) => void

export interface MqttClientService {
  client: MqttClient | null
  connected: boolean
  connect: (config: RegistrationResponse) => Promise<void>
  disconnect: () => Promise<void>
  publish: (topic: string, payload: unknown) => Promise<void>
  subscribe: (topic: string) => Promise<void>
  onMessage: (handler: MqttMessageHandler) => void
  offMessage: (handler: MqttMessageHandler) => void
}

interface MqttClientInternalState {
  client: MqttClient | null
  connected: boolean
  desiredConnected: boolean
  registration: RegistrationResponse | null
  brokerUrl: string | null
  subscriptions: Set<string>
  messageHandlers: Set<MqttMessageHandler>
  reconnectAttempt: number
  reconnectTimer: ReturnType<typeof setTimeout> | null
}

const RECONNECT_BASE_DELAY_MS = 1000
const RECONNECT_MAX_DELAY_MS = 30000

const mqttClientState: MqttClientInternalState = {
  client: null,
  connected: false,
  desiredConnected: false,
  registration: null,
  brokerUrl: null,
  subscriptions: new Set(),
  messageHandlers: new Set(),
  reconnectAttempt: 0,
  reconnectTimer: null,
}

let boundClient: MqttClient | null = null

function resolveBrokerUrl(config: RegistrationResponse): string {
  if (MQTT_BROKER_URL) {
    return MQTT_BROKER_URL
  }

  if (config.mqtt.host && config.mqtt.port) {
    const isBrowser = typeof window !== 'undefined'
    const protocol = isBrowser
      ? config.mqtt.ssl
        ? 'wss'
        : 'ws'
      : config.mqtt.ssl
        ? 'mqtts'
        : 'mqtt'

    return `${protocol}://${config.mqtt.host}:${config.mqtt.port}`
  }

  return MQTT_BROKER_URL
}

function buildMqttOptions(config: RegistrationResponse): mqtt.IClientOptions {
  const options: mqtt.IClientOptions = {
    clientId: config.mqtt.clientId,
    keepalive: config.mqtt.keepalive,
    connectTimeout: config.mqtt.connectTimeout,
    reconnectPeriod: 0,
    clean: config.mqtt.clean,
  }

  if (config.mqtt.username) {
    options.username = config.mqtt.username
  }

  if (config.mqtt.password) {
    options.password = config.mqtt.password
  }

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

function clearReconnectTimer(): void {
  if (!mqttClientState.reconnectTimer) {
    return
  }

  clearTimeout(mqttClientState.reconnectTimer)
  mqttClientState.reconnectTimer = null
}

function computeReconnectDelay(attempt: number): number {
  const exponentialDelay = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * 2 ** attempt)
  const jitter = Math.floor(Math.random() * 400)
  return exponentialDelay + jitter
}

function dispatchMessage(topic: string, message: Uint8Array): void {
  for (const handler of mqttClientState.messageHandlers) {
    handler(topic, message)
  }
}

async function resubscribeAll(): Promise<void> {
  for (const topic of mqttClientState.subscriptions) {
    await mqttBaseClientService.subscribe(topic, 1)
  }
}

function scheduleReconnect(): void {
  if (!mqttClientState.desiredConnected || mqttClientState.reconnectTimer) {
    return
  }

  const delay = computeReconnectDelay(mqttClientState.reconnectAttempt)
  mqttClientState.reconnectAttempt += 1

  mqttClientState.reconnectTimer = setTimeout(() => {
    mqttClientState.reconnectTimer = null
    void reconnectWithBackoff()
  }, delay)
}

async function reconnectWithBackoff(): Promise<void> {
  if (!mqttClientState.desiredConnected || !mqttClientState.registration) {
    return
  }

  try {
    await connectWithCurrentConfig()
  }
  catch {
    scheduleReconnect()
  }
}

function detachClientHandlers(): void {
  if (!boundClient) {
    return
  }

  boundClient.off('connect', handleClientConnect)
  boundClient.off('close', handleClientClose)
  boundClient.off('offline', handleClientOffline)
  boundClient.off('error', handleClientError)
  boundClient.off('message', handleClientMessage)
  boundClient = null
}

function attachClientHandlers(client: MqttClient): void {
  if (boundClient === client) {
    return
  }

  detachClientHandlers()

  client.on('connect', handleClientConnect)
  client.on('close', handleClientClose)
  client.on('offline', handleClientOffline)
  client.on('error', handleClientError)
  client.on('message', handleClientMessage)

  boundClient = client
}

function handleClientConnect(): void {
  mqttClientState.connected = true
  mqttClientState.reconnectAttempt = 0
  clearReconnectTimer()

  void resubscribeAll()
}

function handleClientClose(): void {
  mqttClientState.connected = false
  scheduleReconnect()
}

function handleClientOffline(): void {
  mqttClientState.connected = false
  scheduleReconnect()
}

function handleClientError(): void {
  mqttClientState.connected = false
  scheduleReconnect()
}

function handleClientMessage(topic: string, message: Uint8Array): void {
  dispatchMessage(topic, message)
}

async function connectWithCurrentConfig(): Promise<void> {
  const registration = mqttClientState.registration
  const brokerUrl = mqttClientState.brokerUrl

  if (!registration || !brokerUrl) {
    throw new Error('MQTT config not initialized')
  }

  const options = buildMqttOptions(registration)

  await mqttBaseClientService.disconnect().catch(() => {
    // Ignore stale client close failures
  })

  await mqttBaseClientService.connect(brokerUrl, options)

  const client = mqttBaseClientService.client
  mqttClientState.client = client
  mqttClientState.connected = mqttBaseClientService.connected

  if (client) {
    attachClientHandlers(client)
    await resubscribeAll()
  }

  mqttClientState.reconnectAttempt = 0
}

async function connect(config: RegistrationResponse): Promise<void> {
  mqttClientState.desiredConnected = true
  mqttClientState.registration = config
  mqttClientState.brokerUrl = resolveBrokerUrl(config)
  clearReconnectTimer()

  if (mqttClientState.connected && mqttClientState.client) {
    return
  }

  try {
    await connectWithCurrentConfig()
  }
  catch (error) {
    scheduleReconnect()
    throw error
  }
}

async function disconnect(): Promise<void> {
  mqttClientState.desiredConnected = false
  mqttClientState.reconnectAttempt = 0
  clearReconnectTimer()
  detachClientHandlers()

  await mqttBaseClientService.disconnect()

  mqttClientState.client = mqttBaseClientService.client
  mqttClientState.connected = mqttBaseClientService.connected
}

async function publish(topic: string, payload: unknown): Promise<void> {
  const message = typeof payload === 'string' ? payload : JSON.stringify(payload)

  await mqttBaseClientService.publish(topic, message, 1)
}

async function subscribe(topic: string): Promise<void> {
  mqttClientState.subscriptions.add(topic)

  if (!mqttClientState.connected) {
    return
  }

  await mqttBaseClientService.subscribe(topic, 1)
}

function onMessage(handler: MqttMessageHandler): void {
  mqttClientState.messageHandlers.add(handler)
}

function offMessage(handler: MqttMessageHandler): void {
  mqttClientState.messageHandlers.delete(handler)
}

export const mqttClientService: MqttClientService = {
  get client() {
    return mqttClientState.client
  },
  set client(client) {
    mqttClientState.client = client
  },
  get connected() {
    return mqttClientState.connected
  },
  set connected(connected) {
    mqttClientState.connected = connected
  },
  connect,
  disconnect,
  publish,
  subscribe,
  onMessage,
  offMessage,
}
