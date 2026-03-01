# MQTT Protocol Specification

## Topic Structure

```
players/{deviceId}/{category}
```

### Topics

| Purpose   | Topic Pattern                  | Direction        |
| --------- | ------------------------------ | ---------------- |
| Commands  | `players/{deviceId}/commands`  | Backend → Player |
| Responses | `players/{deviceId}/responses` | Player → Backend |
| Events    | `players/{deviceId}/events`    | Player → Backend |

## Message Envelopes

### Command Envelope

Sent by backend to execute actions on player.

```typescript
{
  type: 'command',
  commandId: string,      // UUID for idempotency
  command: CommandType,   // Command name
  timestamp: number,      // Unix ms
  params?: Record<string, unknown>
}
```

### Command Result Envelope

Sent by player after command execution.

```typescript
{
  type: 'command_result',
  command: CommandType,
  correlationId: string,  // Matches commandId
  status: 'success' | 'error',
  timestamp: number,
  payload?: unknown,
  error?: {
    code: string,
    message: string,
    details?: Record<string, unknown>
  }
}
```

### Command Acknowledgment (Optional)

For long-running operations like screenshot:

```typescript
{
  type: 'command_ack',
  command: CommandType,
  correlationId: string,
  status: 'received' | 'processing' | 'uploading',
  message: string,
  timestamp: number
}
```

### Event Envelope

Fire-and-forget telemetry from player.

```typescript
{
  type: 'event',
  event: EventType,
  timestamp: number,
  payload?: Record<string, unknown>
}
```

## Command Types

| Command           | Params               | Description                        |
| ----------------- | -------------------- | ---------------------------------- |
| `reload_playlist` | -                    | Fetch latest playlist from backend |
| `restart_player`  | -                    | Reload application                 |
| `play`            | -                    | Resume playback                    |
| `pause`           | -                    | Pause playback                     |
| `set_volume`      | `{ level: number }`  | Volume 0-100                       |
| `screenshot`      | -                    | Capture screenshot, returns base64 |
| `update_config`   | `{ config: object }` | Update player config               |
| `ping`            | -                    | Health check                       |

**Note:** `update_config` is defined in the contract but not implemented by the active handler.

### Screenshot Response Payload

The screenshot command captures the screen and returns a base64-encoded image in the response payload:

```typescript
interface ScreenshotResponsePayload {
  base64: string // Base64-encoded image data
  mimeType: string // e.g., 'image/png'
}
```

**Note:** There is no REST endpoint for screenshots. Screenshot capture is initiated via MQTT command and the base64 image is returned in the `command_result` response payload. HTTP upload is not implemented.

## QoS Strategy

| Message Type | QoS | Rationale                                                    |
| ------------ | --- | ------------------------------------------------------------ |
| Commands     | 1   | Reliable delivery required; player deduplicates by commandId |
| Responses    | 1   | Backend must receive acknowledgment                          |
| Events       | 0   | Telemetry; loss acceptable                                   |

Commands use QoS 1 (at-least-once) because:

- Network interruptions common in signage deployments
- Player implements idempotency via commandId tracking
- Duplicate commands are rejected with error response

## Connection Parameters

```typescript
{
  keepalive: 60,           // Seconds between pings
  connectTimeout: 30000,   // 30s connection timeout
  reconnectPeriod: 5000,   // 5s between reconnect attempts
  clean: true,             // Clean session (no offline queue)
}
```

## Idempotency Behavior

The player tracks processed `commandId` values and rejects duplicates:

```
Backend → Player: {commandId: "abc", command: "play"}
Player → Backend: {correlationId: "abc", status: "success"}

Backend → Player: {commandId: "abc", command: "play"}  // Duplicate
Player → Backend: {correlationId: "abc", status: "error", error: {code: "DUPLICATE"}}
```

Note: Command history is in-memory only; duplicates are not detected across player restarts.

## Example Flows

### Playlist Reload

```
Backend → players/player-001/commands
{
  "type": "command",
  "commandId": "cmd-001",
  "command": "reload_playlist",
  "timestamp": 1709000000000
}

Player → players/player-001/responses
{
  "type": "command_result",
  "command": "reload_playlist",
  "correlationId": "cmd-001",
  "status": "success",
  "timestamp": 1709000000500
}
```

### Screenshot

```
Backend → players/player-001/commands
{
  "type": "command",
  "commandId": "cmd-002",
  "command": "screenshot",
  "timestamp": 1709000000000
}

Player → players/player-001/responses
{
  "type": "command_result",
  "command": "screenshot",
  "correlationId": "cmd-002",
  "status": "success",
  "timestamp": 1709000001000,
  "payload": {
    "base64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "mimeType": "image/png"
  }
}
```

### Volume Control

```
Backend → players/player-001/commands
{
  "type": "command",
  "commandId": "cmd-003",
  "command": "set_volume",
  "timestamp": 1709000000000,
  "params": { "level": 75 }
}
```

## Error Codes

| Code                  | Description                        |
| --------------------- | ---------------------------------- |
| `INVALID_PAYLOAD`     | Command envelope failed validation |
| `UNSUPPORTED_COMMAND` | Unknown command type               |
| `NO_HANDLER`          | No handler registered for command  |
| `EXECUTION_FAILED`    | Handler threw exception            |
| `DUPLICATE`           | Command ID already processed       |

## Testing with mosquitto-cli

```bash
# Subscribe to responses
mosquitto_sub -h localhost -p 1883 -u admin -P admin1234567 \
  -t players/player-001/responses

# Send command
mosquitto_pub -h localhost -p 1883 -u admin -P admin1234567 \
  -t players/player-001/commands \
  -m '{"type":"command","commandId":"'$(uuidgen)'","command":"ping","timestamp":'$(date +%s%3N)'}'
```
