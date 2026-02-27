# Architecture Overview

## Current Structure

```
digital-signage/
├── apps/
│   ├── backend/              # Hono API server
│   │   src/
│   │   ├── app/
│   │   │   ├── command-processor/   # Command validation and routing
│   │   │   ├── mqtt/                # MQTT client and provisioning
│   │   │   ├── logger/              # Pino logging setup
│   │   │   └── server/              # Hono app factory
│   │   ├── routes/
│   │   │   ├── health/              # Health check endpoints
│   │   │   ├── register/            # Device registration
│   │   │   └── playlist/            # Playlist fetch endpoint
│   │   ├── db/                      # Database connection (lazy init)
│   │   └── config.ts                # Environment configuration
│   └── player-tizen/         # Tizen player application
│       src/
│       ├── app/
│       │   ├── bootstrap/           # Registration and MQTT connect flow
│       │   ├── commands/            # Command bus and handlers
│       │   ├── composables/         # Vue composables (player view)
│       │   ├── mqtt/                # MQTT client wrapper
│       │   ├── platform/            # Platform adapters (Tizen/Web)
│       │   ├── request/             # HTTP request utilities
│       │   └── stores/              # Pinia stores (playlist, media, device)
│       ├── main.ts                  # Vue app entry
│       └── config.ts                # Player configuration
├── packages/
│   ├── contracts/            # Shared TypeScript definitions
│   │   ├── commands.ts              # Command/result envelopes
│   │   ├── playlist.ts              # Playlist and media types
│   │   ├── registration.ts          # Registration request/response
│   │   └── screenshot.ts            # Screenshot metadata
│   └── config/               # Shared config contracts
└── docker/                   # Infrastructure (Postgres, Mosquitto)
```

## Layered Architecture

### Backend Layers

1. **Routes (HTTP)**: OpenAPIHono handlers for REST endpoints with automatic OpenAPI generation. Routes are registered via `doc.ts` modules using Zod schemas for type-safe request/response validation.
2. **Controllers**: Request/response handling
3. **Services**: Business logic (registration, playlist)
4. **Repositories**: Data access (PostgreSQL relational tables)
5. **MQTT Service**: Async messaging layer

### Player Layers

1. **Presentation**: Vue components and composables
2. **Application**: Command bus, bootstrap logic
3. **Domain**: Stores (Pinia) for state management
4. **Infrastructure**: MQTT client, HTTP requests, platform adapters

## Bootstrap Flow

```
┌─────────┐     POST /api/register      ┌─────────┐
│ Player  │ ───────────────────────────▶│ Backend │
│         │ {deviceId}                   │         │
│         │ ◀───────────────────────────│         │
│         │ {mqtt: {host, port, ...}}    │         │
└────┬────┘                              └─────────┘
     │
     │ Connect MQTT (ws://host:port)
     ▼
┌─────────┐     Subscribe:              ┌─────────┐
│ Player  │     devices/{id}/commands   │ Broker  │
│         │ ───────────────────────────▶│         │
│         │                             │         │
│         │ ◀───────────────────────────│         │
│         │     Publish commands        │         │
└─────────┘                             └─────────┘
```

## Key Design Decisions

### 1. Shared Contracts Package

Types defined once in `packages/contracts`, consumed by both backend and player. Ensures protocol compatibility.

### 2. Command Bus Pattern

Player uses a command bus for decoupled command handling:

- Validation via `validateCommandEnvelope()` from contracts
- Handlers registered for specific command types
- Idempotency via `commandId` tracking

### 3. Lazy Database Initialization

Backend uses Go-style lazy init: DB connection created on first query, not at module load. Prevents startup failures when DB unavailable.

### 4. MQTT Shared Client

Both backend and player use MQTT.js with explicit `connect()` calls. Backend provisions devices via DynSec on first registration.

### 5. Offline-First Media Storage

- Playlist metadata: Pinia store with persisted-state plugin (survives restarts)
- Media: Cache API (handles blobs, streaming)
- No IndexedDB: Cache API sufficient for media blobs

## Trade-offs

| Decision                       | Pros                       | Cons                    |
| ------------------------------ | -------------------------- | ----------------------- |
| PostgreSQL repositories        | Persistent, relational     | Requires infrastructure |
| Pinia persisted-state playlist | Reactive, survives restart | Plugin dependency       |
| Cache API for media            | Native blob support        | Quota varies by browser |
| No command queue               | Simpler implementation     | Commands lost offline   |
| QoS 1 for commands             | Reliable delivery          | Potential duplicates    |
| Single WGT build               | Simpler CI/CD              | No platform variants    |

## Scalability Considerations

Current implementation optimized for demonstration:

1. **Backend**: Single instance, PostgreSQL storage. For production:
   - Add Redis for session/command caching
   - Horizontal scaling with sticky sessions or shared MQTT state

2. **MQTT**: Single Mosquitto instance. For production:
   - Clustered MQTT (EMQ X, HiveMQ)
   - TLS termination at load balancer

3. **Player**: No update mechanism. For production:
   - OTA update via Tizen Store or custom CDN
   - Version compatibility checks

## Technology Choices

| Component         | Choice  | Rationale                                          |
| ----------------- | ------- | -------------------------------------------------- |
| Backend Framework | Hono    | Lightweight, TypeScript-native, middleware support |
| MQTT Client       | MQTT.js | Works in Node and browser, mature                  |
| Player Framework  | Vue 3   | Composition API, good TypeScript support           |
| State Management  | Pinia   | Official Vue solution, devtools support            |
| Build Tool        | Vite    | Fast HMR, modern output                            |
| Package Manager   | pnpm    | Workspace support, disk efficient                  |
| Task Runner       | Turbo   | Incremental builds, caching                        |
