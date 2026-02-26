const env = (
  import.meta as unknown as { env?: { VITE_API_BASE_URL?: string, VITE_MQTT_BROKER_URL?: string } }
).env

export const BACKEND_URL = env?.VITE_API_BASE_URL ?? 'http://localhost:3000'
export const MQTT_BROKER_URL = env?.VITE_MQTT_BROKER_URL ?? 'mqtt://localhost:1883'
