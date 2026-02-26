# Project Decisions Log

## Architecture Decisions

### ADR-001: Clean Architecture Pattern

**Status**: Approved
**Date**: 2024-02-25

**Decision**: Use Clean Architecture (Onion/Hexagonal) to separate concerns and enable platform independence.

**Rationale**:

- Core business logic isolated from frameworks
- Easy to test without platform dependencies
- Platform-specific code in outer layers only

**Consequences**:

- More boilerplate code
- Steeper learning curve for new developers
- Better long-term maintainability

---

### ADR-002: MQTT 5.0 with QoS 1

**Status**: Approved
**Date**: 2024-02-25

**Decision**: Use MQTT 5.0 protocol with Quality of Service level 1 for device commands.

**Rationale**:

- At-least-once delivery guarantees command execution
- Efficient for IoT/Smart TV environments
- Lightweight compared to HTTP polling
- Native support for last-will and testament

**Consequences**:

- Requires MQTT broker infrastructure
- Need retry logic for duplicate messages
- Connection state must be carefully managed

---

### ADR-003: Service Worker + IndexedDB

**Status**: Approved
**Date**: 2024-02-25

**Decision**: Implement offline-first using Service Worker for caching and IndexedDB for structured data storage.

**Rationale**:

- Service Worker provides network proxy capabilities
- IndexedDB supports large binary content (images, videos)
- Both APIs supported on Tizen 9.0+ and webOS 25+
- Enables true offline playback capability

**Consequences**:

- Additional complexity in sync logic
- Storage quota management required
- Background sync needs careful error handling

---

### ADR-004: TypeScript with Vite

**Status**: Approved
**Date**: 2024-02-25

**Decision**: Use TypeScript as primary language with Vite as build tool.

**Rationale**:

- Type safety reduces runtime errors on Smart TVs
- Vite fast development experience
- Tree-shaking for smaller bundles
- Native ESM support

**Consequences**:

- Build step required for deployment
- Type definitions needed for platform APIs

---

### ADR-005: Vue 3 as Frontend Framework

**Status**: Approved
**Date**: 2025-02-25

**Decision**: Use Vue 3 with Composition API for the player application UI layer.

**Rationale**:

- Lightweight compared to React on resource-constrained Smart TVs
- Composition API enables better code organization
- Excellent TypeScript support
- Reactive state management without external libraries
- Smaller bundle size for Tizen/webOS targets

**Consequences**:

- Team needs Vue 3 expertise
- Different pattern than vanilla TypeScript originally planned
- Vue-specific tooling required

---

### ADR-006: Axios with Module-Level Service Instances

**Status**: Approved
**Date**: 2025-02-25

**Decision**: Use Axios for HTTP communication with module-level service class instances (non-singleton pattern).

**Rationale**:

- Axios provides consistent API across platforms
- Request/response interceptors for auth and error handling
- Module-level instances avoid singleton complexity while maintaining reusability
- Easy to mock for testing
- Built-in timeout and cancellation support

**Consequences**:

- Additional dependency (~13KB gzipped)
- Module-level instances require careful import management
- Not using Pinia/Vuex for HTTP state (intentional separation)

---

### ADR-007: pnpm Monorepo with Workspace Protocol

**Status**: Approved
**Date**: 2025-02-25

**Decision**: Use pnpm workspaces for monorepo management with workspace:\* protocol for internal dependencies.

**Rationale**:

- Efficient disk usage with content-addressable store
- workspace:\* protocol ensures consistent internal package versions
- Fast installation and linking
- Native support for nested workspace structures

**Consequences**:

- Requires pnpm installation (not npm/yarn compatible)
- CI/CD needs pnpm setup

---

### ADR-008: Path Alias Import Policy

**Status**: Approved
**Date**: 2026-02-26

**Decision**: Use path aliases (`@/`, `#/`) for all cross-module imports. Never use relative imports (`../`) for files outside the same directory.

**Rationale**:

- Consistent import style across the codebase
- Refactoring is safer (move files without changing imports)
- Clear module boundaries
- Works with TypeScript and Vite path resolution

**Consequences**:

- Requires `tsconfig.json` path mappings
- Build tools must resolve aliases correctly

---

### ADR-009: Backend App/Routes Layout

**Status**: Approved
**Date**: 2026-02-26

**Decision**: Backend uses `app/` directory for Hono app factory and `routes/` for route definitions. Routes are organized by domain (health, commands, etc.).

**Rationale**:

- Clear separation between app setup and route handlers
- Domain-based route organization scales with feature growth
- Hono's factory pattern enables testable app instances

**Consequences**:

- More directory nesting than flat structure
- Route files must follow naming conventions

---

### ADR-010: Environment Split for MQTT

**Status**: Approved
**Date**: 2026-02-26

**Decision**: MQTT configuration uses separate env files per environment (`.env.development`, `.env.production`). No runtime environment detection in config files.

**Rationale**:

- Build-time env selection prevents accidental misconfiguration
- Vite handles env file loading automatically
- Secrets stay out of source control

**Consequences**:

- Requires separate builds for each environment
- CI/CD must inject correct env file

---

### ADR-011: No Code Comments Policy

**Status**: Approved
**Date**: 2026-02-26

**Decision**: Code should be self-documenting. No inline comments or JSDoc. Variable and function names must clearly express intent.

**Rationale**:

- Comments often become outdated and misleading
- Clear naming is a better investment than documentation maintenance
- TypeScript types provide sufficient API documentation

**Consequences**:

- Higher standard required for naming conventions
- New developers may need more time to understand complex logic
- External API documentation must be maintained separately if needed

---

### ADR-012: Go-Style Database Initialization

**Status**: Approved
**Date**: 2026-02-26

**Decision**: Use Go-style lazy initialization for database connections: `let db: Pool | null = null` with explicit `connectDb()` function called at startup.

**Rationale**:

- Explicit connection lifecycle prevents race conditions
- Clear error handling at startup vs runtime
- Module-level state is mutable but controlled
- Easier to test with dependency injection

**Consequences**:

- Requires explicit startup sequence
- Database unavailable until connectDb() completes
- Must handle connection failures at application startup

---

### ADR-013: Shared MQTT Client with Explicit Connect

**Status**: Approved
**Date**: 2026-02-26

**Decision**: Use a shared MQTT client instance with explicit `connect()` pattern. Separate client configuration for browser (WebSocket) vs backend (TCP).

**Rationale**:

- Single connection per application instance
- Explicit lifecycle management (connect/disconnect/reconnect)
- Browser requires WebSocket (ws://:9001) vs backend TCP
- Environment-specific client config (MQTT*CLIENT*\* for browser)

**Consequences**:

- Must manage connection state explicitly
- Reconnection logic required
- Different protocols for browser vs backend

---

### ADR-014: Pino for Structured Logging

**Status**: Approved
**Date**: 2026-02-26

**Decision**: Use pino for structured JSON logging. Logger located at `src/app/logger/logger.ts`.

**Rationale**:

- High performance, low overhead
- Structured JSON output for log aggregation
- TypeScript support with pino-pretty for development
- Standard logging interface across backend services

**Consequences**:

- Additional dependency
- Log format changes require configuration updates
- Pretty printing only for development

---

### ADR-015: Minimal API Responses

**Status**: Approved
**Date**: 2026-02-26

**Decision**: API responses should be minimal. Health endpoint returns only `{status: 'ok'}`. Registration returns only essential fields.

**Rationale**:

- Reduces payload size
- Simplifies client code
- No unnecessary data exposure
- Self-documenting through clear endpoint names

**Consequences**:

- Clients cannot rely on verbose responses
- Additional endpoints needed for detailed status
- Breaking change if clients expect removed fields
