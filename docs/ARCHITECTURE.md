# Architecture Overview

## Project Structure

```
digital-signage/
├── apps/
│   ├── backend/          # Hono + TypeScript API server
│   └── player-tizen/     # Tizen-first player application
├── packages/
│   ├── contracts/        # Shared schemas and types
│   └── config/           # Environment/config contracts
└── docs/                 # Documentation
```

## Architecture Pattern: Clean Architecture

### Backend (apps/backend)
```
src/
├── api/              # HTTP route handlers (Hono)
│   ├── health/
│   ├── register/
│   ├── playlist/
│   └── screenshots/
├── core/             # Business logic
│   ├── registration.ts
│   ├── playlist.ts
│   └── command-processor.ts
├── mqtt/             # MQTT broker integration
│   └── service.ts
└── storage/          # Data persistence
    └── repositories.ts
```

### Player (apps/player-tizen)
```
src/
├── core/             # Domain bootstrap
│   └── bootstrap.ts
├── application/      # Use cases
│   ├── commands/
│   ├── playlist/
│   └── player/
├── infrastructure/   # External concerns
│   ├── mqtt/
│   ├── storage/
│   ├── http/
│   └── platform/
│       ├── tizen/
│       └── web/
└── presentation/     # UI layer
    ├── ui/
    └── components/
```

## Dynamic Registration Flow

```
┌──────────┐         POST /api/register          ┌──────────┐
│  Player  │ ──────────────────────────────────▶ │ Backend  │
│          │ {deviceId, type, capabilities}       │          │
│          │                                      │          │
│          │ ◀────────────────────────────────── │          │
│          │ {mqtt: {host, port, clientId},       │          │
│          │  topics: {commands, responses}}      │          │
└──────────┘                                       └──────────┘
       │
       │ Connect MQTT
       ▼
┌──────────┐
│  MQTT    │
│  Broker  │
└──────────┘
```

## Data Flow

- [ ] Player registers over HTTP, receives MQTT config
- [ ] Player subscribes to `{baseTopic}/commands`
- [ ] Backend publishes commands to `{baseTopic}/commands`
- [ ] Player publishes results to `{baseTopic}/responses`
- [ ] Screenshots uploaded via HTTP POST (binary)

## Technology Stack

| Layer        | Technology                     |
|--------------|--------------------------------|
| Backend      | Hono, MQTT.js                  |
| Player       | TypeScript, Vite, MQTT.js      |
| Protocol     | HTTP (REST), MQTT              |
| Storage      | IndexedDB (player), TBD (backend) |

## Design Decisions

- TODO: Document key architectural decisions
- TODO: Document trade-offs considered
- TODO: Document scalability considerations
