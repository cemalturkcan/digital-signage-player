const DEFAULT_LOCALE = 'en'

const MESSAGES = {
  en: {
    command_dispatch_failed: 'Failed to dispatch command',
    command_response_timeout: 'Command response timeout after {timeoutMs}ms',
    command_execution_failed_on_device: 'Command execution failed on device',
    mqtt_client_not_connected: 'MQTT client not connected',
    mqtt_subscribe_rejected: 'MQTT subscribe rejected by broker',
    mqtt_publish_failed: 'MQTT publish failed for all command topics',
    set_volume_level_range: 'set_volume requires level in [0, 100]',
  },
} as const

type MessageKey = keyof (typeof MESSAGES)[typeof DEFAULT_LOCALE]
type Params = Record<string, string | number>

export function t(key: MessageKey, params?: Params): string {
  const template = MESSAGES[DEFAULT_LOCALE][key]
  if (!params) {
    return template
  }

  return template.replace(/\{(\w+)\}/g, (_, token) => {
    return String(params[token] ?? `{${token}}`)
  })
}
