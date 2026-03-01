export type RuntimeName = 'tizen' | 'web'

function resolveRuntimeName(): RuntimeName {
  if (import.meta.env.VITE_RUNTIME_NAME === 'tizen' || import.meta.env.MODE === 'tizen')
    return 'tizen'

  return 'web'
}

export const RUNTIME_NAME = resolveRuntimeName()
export const APP_BASE_URL = import.meta.env.BASE_URL
export const BACKEND_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'
export const MQTT_BROKER_URL = import.meta.env.VITE_MQTT_BROKER_URL ?? ''
export const MQTT_TOPIC_NAMESPACE = import.meta.env.VITE_MQTT_TOPIC_NAMESPACE ?? 'players'
