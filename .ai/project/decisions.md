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
