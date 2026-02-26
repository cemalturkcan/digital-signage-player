import mqtt from 'mqtt'
import type { MqttClient } from 'mqtt'

export interface MqttBaseClientService {
  client: MqttClient | null
  connected: boolean
  connect: (brokerUrl: string, options?: mqtt.IClientOptions) => Promise<void>
  disconnect: () => Promise<void>
  publish: (topic: string, payload: string, qos?: 0 | 1 | 2) => Promise<void>
  subscribe: (topic: string, qos?: 0 | 1 | 2) => Promise<void>
}

async function waitForConnect(client: MqttClient): Promise<void> {
  return new Promise((resolve, reject) => {
    const onConnect = () => {
      client.off('error', onError)
      resolve()
    }

    const onError = (err: Error) => {
      client.off('connect', onConnect)
      reject(err)
    }

    client.once('connect', onConnect)
    client.once('error', onError)
  })
}

async function endClient(client: MqttClient): Promise<void> {
  return new Promise((resolve) => {
    client.end(false, {}, () => resolve())
  })
}

async function publishWithCallback(
  client: MqttClient,
  topic: string,
  payload: string,
  qos: 0 | 1 | 2
): Promise<void> {
  return new Promise((resolve, reject) => {
    client.publish(topic, payload, { qos }, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

async function subscribeWithCallback(
  client: MqttClient,
  topic: string,
  qos: 0 | 1 | 2
): Promise<void> {
  return new Promise((resolve, reject) => {
    client.subscribe(topic, { qos }, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

function attachConnectionStateHandlers(client: MqttClient, state: { connected: boolean }): void {
  client.on('connect', () => {
    state.connected = true
  })

  client.on('close', () => {
    state.connected = false
  })

  client.on('offline', () => {
    state.connected = false
  })

  client.on('error', () => {
    state.connected = false
  })
}

async function connect(brokerUrl: string, options?: mqtt.IClientOptions): Promise<void> {
  if (mqttBaseClientService.client?.connected) {
    return
  }

  const client = mqtt.connect(brokerUrl, options)

  mqttBaseClientService.client = client
  attachConnectionStateHandlers(client, mqttBaseClientService)

  try {
    await waitForConnect(client)
    mqttBaseClientService.connected = true
  } catch (err) {
    mqttBaseClientService.client = null
    mqttBaseClientService.connected = false
    throw err
  }
}

async function disconnect(): Promise<void> {
  const client = mqttBaseClientService.client
  if (!client) {
    return
  }

  await endClient(client)
  mqttBaseClientService.connected = false
  mqttBaseClientService.client = null
}

async function publish(topic: string, payload: string, qos: 0 | 1 | 2 = 1): Promise<void> {
  const client = mqttBaseClientService.client
  if (!client || !mqttBaseClientService.connected) {
    throw new Error('MQTT client not connected')
  }

  await publishWithCallback(client, topic, payload, qos)
}

async function subscribe(topic: string, qos: 0 | 1 | 2 = 1): Promise<void> {
  const client = mqttBaseClientService.client
  if (!client || !mqttBaseClientService.connected) {
    throw new Error('MQTT client not connected')
  }

  await subscribeWithCallback(client, topic, qos)
}

export const mqttBaseClientService: MqttBaseClientService = {
  client: null,
  connected: false,
  connect,
  disconnect,
  publish,
  subscribe,
}
