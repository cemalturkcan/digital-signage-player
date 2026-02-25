# Digital Signage Player

Monorepo for digital signage player system with Tizen/WebOS support and MQTT remote control.

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 8.0.0

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development
pnpm dev
```

## Project Structure

```
├── apps/
│   ├── backend/          # Hono API server
│   └── player-tizen/     # Tizen player application
├── packages/
│   ├── contracts/        # Shared types
│   └── config/           # Config contracts
└── docs/                 # Documentation
```

## Development

### Backend

```bash
cd apps/backend
pnpm dev
```

### Player

```bash
cd apps/player-tizen
pnpm dev
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [MQTT Protocol](docs/MQTT_PROTOCOL.md)
- [Offline Strategy](docs/OFFLINE_STRATEGY.md)
- [Tizen Setup](docs/TIZEN_SETUP.md)

## Scripts

| Script        | Description                    |
|---------------|--------------------------------|
| `pnpm build`  | Build all packages             |
| `pnpm dev`    | Start development servers      |
| `pnpm lint`   | Run ESLint                     |
| `pnpm typecheck` | Type-check all packages    |
| `pnpm test`   | Run tests                      |

## Status

This is scaffolding/foundation only. Business logic not yet implemented.

## License

TODO
