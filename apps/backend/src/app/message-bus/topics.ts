import { createDeviceTopicFactory } from '@signage/contracts'
import { MQTT_TOPIC_NAMESPACE } from '@/config.js'

const topicFactory = createDeviceTopicFactory(MQTT_TOPIC_NAMESPACE)

export function commandTopicFor(deviceId: string): string {
  return topicFactory.commandTopicFor(deviceId)
}

export function responseTopicFor(deviceId: string): string {
  return topicFactory.responseTopicFor(deviceId)
}

export function eventTopicFor(deviceId: string): string {
  return topicFactory.eventTopicFor(deviceId)
}

export function statusTopicFor(deviceId: string): string {
  return topicFactory.statusTopicFor(deviceId)
}
