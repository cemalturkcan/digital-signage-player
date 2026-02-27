import type { MqttClient } from 'mqtt'
import mqtt from 'mqtt'

export interface MqttBaseClientService {
  client: MqttClient | null
  connected: boolean
  connect: (brokerUrl: string, options?: mqtt.IClientOptions) => Promise<void>
  disconnect: () => Promise<void>
  publish: (topic: string, payload: string, qos?: 0 | 1 | 2) => Promise<void>
  subscribe: (topic: string, qos?: 0 | 1 | 2) => Promise<void>
}

const mqttBaseClientState: Pick<MqttBaseClientService, 'client' | 'connected'> = {
  client: null,
  connected: false,
}

async function waitForConnect(client: MqttClient): Promise<void> {
  return new Promise((resolve, reject) => {
    let onConnect: () => void
    const onError: (err: Error) => void = (err: Error) => {
      client.off('connect', onConnect)
      reject(err)
    }

    onConnect = () => {
      client.off('error', onError)
      resolve()
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
  if (mqttBaseClientState.client?.connected) {
    return
  }

  const client = mqtt.connect(brokerUrl, options)

  mqttBaseClientState.client = client
  attachConnectionStateHandlers(client, mqttBaseClientState)

  try {
    await waitForConnect(client)
    mqttBaseClientState.connected = true
  } catch (err) {
    mqttBaseClientState.client = null
    mqttBaseClientState.connected = false
    throw err
  }
}

async function disconnect(): Promise<void> {
  const client = mqttBaseClientState.client
  if (!client) {
    return
  }

  await endClient(client)
  mqttBaseClientState.connected = false
  mqttBaseClientState.client = null
}

async function publish(topic: string, payload: string, qos: 0 | 1 | 2 = 1): Promise<void> {
  const client = mqttBaseClientState.client
  if (!client || !mqttBaseClientState.connected) {
    throw new Error('MQTT client not connected')
  }

  await publishWithCallback(client, topic, payload, qos)
}

async function subscribe(topic: string, qos: 0 | 1 | 2 = 1): Promise<void> {
  const client = mqttBaseClientState.client
  if (!client || !mqttBaseClientState.connected) {
    throw new Error('MQTT client not connected')
  }

  await subscribeWithCallback(client, topic, qos)
}

export const mqttBaseClientService: MqttBaseClientService = {
  get client() {
    return mqttBaseClientState.client
  },
  set client(client) {
    mqttBaseClientState.client = client
  },
  get connected() {
    return mqttBaseClientState.connected
  },
  set connected(connected) {
    mqttBaseClientState.connected = connected
  },
  connect,
  disconnect,
  publish,
  subscribe,
}
