import type { MqttClient } from 'mqtt'
import mqtt from 'mqtt'

let mqttClient: MqttClient | null = null

export function getClient(): MqttClient | null {
  return mqttClient
}

async function waitForConnect(client: MqttClient): Promise<void> {
  return new Promise((resolve, reject) => {
    let onConnect: () => void
    const onError = (err: Error) => {
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

export async function connectClient(brokerUrl: string, options?: mqtt.IClientOptions): Promise<void> {
  if (mqttClient?.connected)
    return

  const client = mqtt.connect(brokerUrl, options)
  mqttClient = client

  try {
    await waitForConnect(client)
  }
  catch (err) {
    mqttClient = null
    throw err
  }
}

export async function disconnectClient(): Promise<void> {
  const client = mqttClient
  if (!client)
    return

  await new Promise<void>(resolve => client.end(false, {}, () => resolve()))
  mqttClient = null
}

export async function mqttPublish(topic: string, payload: string, qos: 0 | 1 | 2 = 1): Promise<void> {
  if (!mqttClient?.connected)
    throw new Error('MQTT client not connected')

  await new Promise<void>((resolve, reject) => {
    mqttClient!.publish(topic, payload, { qos }, err => (err ? reject(err) : resolve()))
  })
}

export async function mqttSubscribe(topic: string, qos: 0 | 1 | 2 = 1): Promise<void> {
  if (!mqttClient?.connected)
    throw new Error('MQTT client not connected')

  await new Promise<void>((resolve, reject) => {
    mqttClient!.subscribe(topic, { qos }, err => (err ? reject(err) : resolve()))
  })
}
