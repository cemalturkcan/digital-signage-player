# Digital Signage Player

Monorepo for digital signage player system with Tizen/WebOS support and MQTT remote control.

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- Docker and Docker Compose (for backend infrastructure)
- Tizen Studio (for WGT packaging only)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Infrastructure

```bash
cd docker
docker-compose up -d
```

This starts PostgreSQL and Mosquitto MQTT broker.

### 3. Start Backend

```bash
cd apps/backend
cp .env.example .env  # Edit as needed
pnpm dev
```

Backend runs at http://localhost:3000

#### API Documentation

- OpenAPI JSON: `/openapi.json`
- Swagger UI: `/docs`

Routes are defined with Hono OpenAPI (`@hono/zod-openapi`) in domain `doc.ts` modules using Zod schemas.

### 4. Start Player (Development)

```bash
cd apps/player-tizen
cp .env.example .env  # Set VITE_API_BASE_URL to your backend IP
pnpm dev
```

Player dev server runs at http://localhost:5173

## Build Commands

| Command          | Description                   |
| ---------------- | ----------------------------- |
| `pnpm install`   | Install all dependencies      |
| `pnpm build`     | Build all packages            |
| `pnpm dev`       | Start all development servers |
| `pnpm lint`      | Run ESLint                    |
| `pnpm typecheck` | Type-check all packages       |
| `pnpm test`      | Run tests                     |

### Backend-Specific

```bash
cd apps/backend
pnpm dev          # Development with hot reload
pnpm build        # Compile TypeScript
pnpm start        # Production start
pnpm typecheck    # Type check only
```

### Player-Specific

```bash
cd apps/player-tizen
pnpm dev          # Vite dev server
pnpm dev:mock     # Dev mode with mock data
pnpm build        # Build and package WGT
pnpm typecheck    # Type check only
```

## MQTT Topics and Commands

### Topic Pattern

- Commands: `signage/{deviceId}/commands`
- Responses: `signage/{deviceId}/responses`
- Events: `signage/{deviceId}/events`

### Command Payload Example

```json
{
  "type": "command",
  "commandId": "cmd-123-uuid",
  "command": "reload_playlist",
  "timestamp": 1709000000000,
  "params": {}
}
```

### Command Result Response

```json
{
  "type": "command_result",
  "command": "reload_playlist",
  "correlationId": "cmd-123-uuid",
  "status": "success",
  "timestamp": 1709000000100,
  "payload": null
}
```

### Supported Commands

| Command           | Params               | Description                                                        |
| ----------------- | -------------------- | ------------------------------------------------------------------ |
| `reload_playlist` | -                    | Fetch and load new playlist                                        |
| `restart_player`  | -                    | Restart player application                                         |
| `play`            | -                    | Resume playback                                                    |
| `pause`           | -                    | Pause playback                                                     |
| `set_volume`      | `{ level: number }`  | Set volume (0-100)                                                 |
| `screenshot`      | -                    | Capture screenshot, returns base64 image in payload (MQTT only)    |
| `ping`            | -                    | Health check                                                       |
| `update_config`   | `{ config: object }` | Update player configuration (defined in contract, not implemented) |

**Note:** There is no REST endpoint for screenshots. Screenshot capture is initiated via MQTT command and the base64 image is returned in the `command_result` response payload.

### Test Commands (MQTT CLI)

```bash
# Using mosquitto_pub
mosquitto_pub -h localhost -p 1883 -u admin -P admin1234567 \
  -t signage/test-device-001/commands \
  -m '{"type":"command","commandId":"cmd-001","command":"ping","timestamp":'$(date +%s%3N)'}'

# Screenshot command - returns base64 image in response payload
mosquitto_pub -h localhost -p 1883 -u admin -P admin1234567 \
  -t signage/test-device-001/commands \
  -m '{"type":"command","commandId":"cmd-002","command":"screenshot","timestamp":'$(date +%s%3N)'}'
```

## QoS Rationale

| Message Type | QoS | Rationale                                                                 |
| ------------ | --- | ------------------------------------------------------------------------- |
| Commands     | 1   | At-least-once delivery required; player handles idempotency via commandId |
| Responses    | 1   | Backend must receive acknowledgment                                       |
| Events       | 0   | Fire-and-forget telemetry; loss acceptable                                |

Commands use QoS 1 to ensure delivery during transient network issues. The player implements idempotency by tracking processed commandIds and rejecting duplicates.

## Offline Behavior

The player implements a practical offline-first strategy:

1. **Playlist Caching**: Playlist metadata persisted via Pinia store (using persisted-state plugin)
2. **Media Caching**: Media files cached via Cache API with blob storage
3. **Offline Playback**: Continues playing from cache when network unavailable
4. **Auto-Reconnect**: MQTT client reconnects with 5s period, resumes normal operation
5. **No Command Queue**: Commands received while offline are not queued (limitation)

### Cache Strategy

- Playlist metadata: Pinia store with persisted-state plugin
- Media: Cache API with key pattern `/media/{id}`
- Prefetch: Downloads media items proactively when online

## Tizen Build and Deployment

### Prerequisites

- Tizen Studio installed on Windows or WSL
- Configure `.env.tizen` with TIZEN_CLI path

### Build WGT Package

```bash
cd apps/player-tizen
# Edit .env.tizen:
# TIZEN_CLI=C:/tizen-studio/tools/ide/bin/tizen.bat
# TIZEN_PROFILE=SignageProfile
# TIZEN_AUTHOR_CERT_PASSWORD=yourpassword

pnpm build
# Output: digital_signage_player_0.1.0.wgt
```

### WSL/Windows Caveat

The build script auto-detects WSL and converts paths for Windows Tizen CLI:

- WSL paths converted via `wslpath -m`
- Commands executed via `cmd.exe /c`
- Works with Tizen Studio installed on Windows host

### Emulator Run

1. Launch Tizen Emulator from Tizen Studio
2. Install WGT: `tizen install -n digital_signage_player_0.1.0.wgt -t <emulator-name>`
3. Or drag WGT to emulator window

### Device Deploy

1. Enable Developer Mode on TV
2. Connect to TV IP: `sdb connect <tv-ip>`
3. Install: `tizen install -n digital_signage_player_0.1.0.wgt -t <device-id>`

## Known Limitations

1. **No Command Persistence**: Commands sent while player offline are lost (no server-side queue)
2. **Screenshot**: Canvas-based only; Tizen native screenshot requires privilege not available to web apps
3. **Media Cache Size**: Limited by browser Cache API quota (typically 50-200MB)
4. **No DRM Support**: Widevine/PlayReady not implemented
5. **Single Playlist**: Per-device playlist assignment only; no scheduling
6. **Volume Control**: In-memory fallback when Tizen TV API unavailable

## Project Structure

```
├── apps/
│   ├── backend/          # Hono API + MQTT integration
│   └── player-tizen/     # Vue3 + Vite Tizen player
├── packages/
│   ├── contracts/        # Shared TypeScript types
│   └── config/           # Shared config contracts
├── docker/               # Docker Compose infrastructure
└── docs/                 # Documentation
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) - System design and trade-offs
- [MQTT Protocol](docs/MQTT_PROTOCOL.md) - Message formats and flows
- [Offline Strategy](docs/OFFLINE_STRATEGY.md) - Caching and resilience
- [Tizen Setup](docs/TIZEN_SETUP.md) - Build and deployment
- [Delivery Checklist](docs/DELIVERY_CHECKLIST.md) - Verification steps

## License

MIT
