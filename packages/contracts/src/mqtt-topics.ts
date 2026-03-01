export type MqttTopicCategory = 'commands' | 'responses' | 'events' | 'status'

export interface DeviceTopicFactory {
  commandTopicFor: (deviceId: string) => string
  responseTopicFor: (deviceId: string) => string
  eventTopicFor: (deviceId: string) => string
  statusTopicFor: (deviceId: string) => string
}

export function normalizeTopicNamespace(namespace: string): string {
  const trimmed = namespace.trim().replace(/^\/+|\/+$/g, '')
  return trimmed.length > 0 ? trimmed : 'players'
}

export function createDeviceTopicFactory(namespace: string): DeviceTopicFactory {
  const normalizedNamespace = normalizeTopicNamespace(namespace)

  function topicFor(deviceId: string, category: MqttTopicCategory): string {
    return `${normalizedNamespace}/${deviceId}/${category}`
  }

  return {
    commandTopicFor(deviceId: string): string {
      return topicFor(deviceId, 'commands')
    },

    responseTopicFor(deviceId: string): string {
      return topicFor(deviceId, 'responses')
    },

    eventTopicFor(deviceId: string): string {
      return topicFor(deviceId, 'events')
    },

    statusTopicFor(deviceId: string): string {
      return topicFor(deviceId, 'status')
    },
  }
}
