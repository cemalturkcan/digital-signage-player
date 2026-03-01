export interface CommandEnvelope {
  type: 'command'
  commandId: string
  command: CommandType
  timestamp: number
  params?: Record<string, unknown>
  replyTopic?: string
}

export type CommandType =
  | 'reload_playlist'
  | 'restart_player'
  | 'play'
  | 'pause'
  | 'set_volume'
  | 'screenshot'
  | 'update_config'
  | 'ping'

export interface ScreenshotCommandParams {
  uploadUrl: string
  uploadMethod: 'PUT' | 'POST' | 'PATCH'
  uploadHeaders?: Record<string, string>
  uploadRef?: string
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
}

export interface CommandResultEnvelope {
  type: 'command_result'
  command: CommandType
  correlationId: string
  status: 'success' | 'error'
  timestamp: number
  payload?: unknown
  error?: CommandError
}

export interface CommandAckEnvelope {
  type: 'command_ack'
  command: CommandType
  correlationId: string
  status: 'received' | 'processing' | 'uploading'
  message: string
  timestamp: number
}

export interface CommandError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface EventEnvelope {
  type: 'event'
  event: EventType
  timestamp: number
  payload?: Record<string, unknown>
}

export type EventType =
  | 'playback_started'
  | 'playback_ended'
  | 'playback_error'
  | 'media_loaded'
  | 'network_status'
  | 'storage_warning'
  | 'screenshot_captured'

const VALID_COMMANDS: CommandType[] = [
  'reload_playlist',
  'restart_player',
  'play',
  'pause',
  'set_volume',
  'screenshot',
  'update_config',
  'ping',
]

export function isCommandType(value: unknown): value is CommandType {
  return typeof value === 'string' && VALID_COMMANDS.includes(value as CommandType)
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateCommandEnvelope(envelope: unknown): ValidationResult {
  if (typeof envelope !== 'object' || envelope === null) {
    return { valid: false, error: 'Envelope must be an object' }
  }

  const e = envelope as Record<string, unknown>

  if (e.type !== 'command') {
    return { valid: false, error: 'type must be "command"' }
  }

  if (typeof e.commandId !== 'string' || e.commandId.length === 0) {
    return { valid: false, error: 'commandId must be non-empty string' }
  }

  if (typeof e.timestamp !== 'number' || Number.isNaN(e.timestamp)) {
    return { valid: false, error: 'timestamp must be a number' }
  }

  if (!isCommandType(e.command)) {
    return { valid: false, error: `unknown command: ${e.command}` }
  }

  if (typeof e.replyTopic !== 'undefined' && typeof e.replyTopic !== 'string') {
    return { valid: false, error: 'replyTopic must be string when provided' }
  }

  if (e.command === 'set_volume') {
    const params = e.params as Record<string, unknown> | undefined
    if (typeof params?.level !== 'number') {
      return { valid: false, error: 'set_volume requires numeric level param' }
    }
    if (params.level < 0 || params.level > 100) {
      return { valid: false, error: 'set_volume level must be in [0,100]' }
    }
  }

  return { valid: true }
}
