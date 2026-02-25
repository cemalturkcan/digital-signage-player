export interface CommandEnvelope {
  type: 'command'
  commandId: string
  command: CommandType
  timestamp: number
  params?: Record<string, unknown>
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
