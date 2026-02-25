# Project Profile: digital-signage-player

## Overview
A Smart TV Digital Signage Player application supporting Samsung Tizen and LG WebOS platforms with offline-first capabilities.

## Platforms
- **Samsung Tizen**: v9.0+
- **LG WebOS**: v25+

## Technology Stack
| Category | Technology |
|----------|------------|
| Language | TypeScript |
| Build Tool | Vite |
| State Management | IndexedDB |
| Communication | MQTT.js (MQTT 5.0) |
| Offline Support | Service Worker |

## Architecture
- **Pattern**: Clean Architecture (Domain, Use Case, Interface, Infrastructure layers)
- **Offline Strategy**: Service Worker + IndexedDB for content caching
- **Command Reliability**: MQTT QoS 1 for guaranteed command delivery

## Key Features
- Offline-first content playback
- Remote device management via MQTT
- Platform-specific API abstraction
- Content synchronization and scheduling
- Health monitoring and telemetry

## Project Structure
```
digital-signage-player/
├── src/
│   ├── domain/        # Business entities and rules
│   ├── use-cases/     # Application business rules
│   ├── interfaces/    # Controllers, presenters, UI
│   └── infrastructure/# External services, DB, MQTT
├── platforms/
│   ├── tizen/         # Samsung Tizen specific
│   └── webos/         # LG WebOS specific
├── public/            # Static assets
└── .ai/              # Project state
```

## Build Targets
- `npm run build:tizen` - Build for Samsung Tizen
- `npm run build:webos` - Build for LG WebOS
- `npm run dev` - Development server
