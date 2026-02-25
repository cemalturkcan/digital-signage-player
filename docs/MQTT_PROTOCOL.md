# MQTT Protocol Specification

## Topic Structure

```
signage/{orgId}/{locationId}/{deviceId}/{category}
```

### Examples

| Purpose  | Topic Pattern                                    |
|----------|--------------------------------------------------|
| Commands | `signage/acme/store001/player001/commands`       |
| Responses| `signgage/acme/store001/player001/responses`     |
| Status   | `signage/acme/store001/player001/status`         |
| Events   | `signage/acme/store001/player001/events`         |

## Message Types

### Command Envelope

```typescript
{
  type: 'command',
  commandId: string,      // UUID for correlation
  command: CommandType,   // Command to execute
  timestamp: number,      // Unix ms
  params?: Record<string, unknown>
}
```

### Command Result Envelope

```typescript
{
  type: 'command_result',
  command: CommandType,
  correlationId: string,  // Matches commandId
  status: 'success' | 'error',
  timestamp: number,
  payload?: unknown,
  error?: { code: string, message: string }
}
```

### Command Acknowledgment

Used for long-running operations (e.g., screenshot upload):

```typescript
{
  type: 'command_ack',
  command: 'screenshot',
  correlationId: string,
  status: 'received' | 'processing' | 'uploading',
  message: string,
  timestamp: number
}
```

## QoS Strategy

| Message Type | QoS  | Rationale                    |
|--------------|------|------------------------------|
| Commands     | 1    | Reliable delivery required   |
| Responses    | 1    | Acknowledgment needed        |
| Status       | 1+R  | Last known state for new subs|
| Events       | 0    | Fire-and-forget logging      |
| Heartbeat    | 0    | Loss acceptable              |

## Connection Parameters

```typescript
{
  keepalive: 60,           // Seconds
  connectTimeout: 30000,   // 30s
  reconnectPeriod: 1000,   // 1s initial, exponential backoff
  clean: false,            // Persistent session
  will: {
    topic: '{baseTopic}/status',
    payload: JSON.stringify({ state: 'offline' }),
    qos: 1,
    retain: true
  }
}
```

## Command Types

| Command         | Description                      | Params                    |
|-----------------|----------------------------------|---------------------------|
| reload_playlist | Fetch and load new playlist      | -                         |
| restart_player  | Restart player application       | -                         |
| play            | Resume playback                  | -                         |
| pause           | Pause playback                   | -                         |
| set_volume      | Set audio volume                 | { level: number }         |
| screenshot      | Capture and upload screenshot    | -                         |
| update_config   | Update player configuration      | { config: Partial<Config> }|
| ping            | Health check / keepalive         | -                         |

## Special Cases

### Screenshot Flow

```
1. Backend publishes screenshot command
2. Player ACKs via MQTT (status: received)
3. Player captures screen
4. Player ACKs via MQTT (status: uploading)
5. Player POSTs image to /api/screenshots (HTTP)
6. Backend returns upload response
```

## TODO

- [ ] Document error handling strategy
- [ ] Document retry logic
- [ ] Document rate limiting
- [ ] Document security (TLS, auth)
