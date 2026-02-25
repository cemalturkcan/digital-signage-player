# Digital Signage Player - Project Draft Specification

**Version:** 0.1 (Draft)  
**Date:** 2025-02-25  
**Status:** For Review / Discussion

---

## 1. Project Overview

### 1.1 Purpose
Production-grade Digital Signage Player for Samsung Tizen and LG WebOS Smart TVs with offline-first architecture and MQTT remote control.

### 1.2 Target Platforms
- **Primary:** Samsung Tizen 8.0+ (2024+ TVs)
- **Secondary:** LG WebOS 24+ (2024+ TVs)
- **Development:** Web browser (Chrome/Firefox)

### 1.3 Core Capabilities
- Fetch and cache playlist from remote endpoint
- Sequential media playback (images with duration, videos to completion)
- Playlist looping
- MQTT command processing with response
- Offline operation with cached content
- Graceful error recovery (network, media, parse errors)

---

## 2. Technical Standards (For Discussion)

### 2.1 Language & Build
| Aspect | Current Proposal | Discussion Points |
|--------|------------------|-------------------|
| Language | TypeScript 5.3+ | Strict mode enabled? |
| Target | ES2015 | Is ES2015 sufficient or need ES2020? |
| Build Tool | Vite 7.x (latest stable) | Webpack alternative? |
| Bundler Output | ESM + IIFE | Both formats needed? |

### 2.2 Code Quality
| Tool | Configuration | Discussion |
|------|--------------|------------|
| ESLint | `@typescript-eslint/recommended` + custom rules | Which rules strict? |
| Prettier | Default + 2 spaces, single quotes | Preferences? |
| Testing | Vitest | Jest alternative? |
| Coverage Target | 60% | Higher target? |

### 2.3 Architecture Patterns (NEED DECISION)

#### Option A: Clean Architecture (Proposed)
```
src/
├── core/           # Domain (entities, value objects)
├── application/    # Use cases (business logic)
├── infrastructure/ # External concerns (MQTT, storage, platform)
└── presentation/   # UI layer
```

#### Option B: Feature-Based
```
src/
├── playlist/       # Feature module
├── player/         # Feature module
├── mqtt/           # Feature module
└── storage/        # Feature module
```

#### Option C: Simple Layered
```
src/
├── models/         # Data models
├── services/       # Business logic
├── repositories/   # Data access
└── ui/             # Components
```

**Question:** Which architecture aligns with your preferences?

---

## 3. Data Models (For Review)

### 3.1 Playlist Schema
```typescript
interface Playlist {
  id: string;
  version: string;           // For cache invalidation
  loop: boolean;             // Loop playlist?
  items: MediaItem[];
  updatedAt: number;         // Unix timestamp
}

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  duration?: number;         // Seconds, required for images
  order: number;
  checksum?: string;         // For integrity validation
}
```

**Discussion Points:**
- Add `checksum` for media integrity?
- Support audio files?
- Support streaming URLs (HLS/DASH)?
- Need scheduling (play at specific times)?

### 3.2 Command Schema
```typescript
interface Command {
  commandId: string;         // UUID for deduplication
  type: CommandType;
  timestamp: number;
  params?: Record<string, unknown>;
}

type CommandType = 
  | 'reload_playlist'
  | 'restart_player' 
  | 'play'
  | 'pause'
  | 'set_volume'
  | 'screenshot';
```

**Discussion Points:**
- Additional commands needed?
- `seek` command for videos?
- `update_config` command?

### 3.3 Response Schema (UPDATED - Screenshot via HTTP)

**Standard Command Response (MQTT):**
```typescript
interface CommandResponse {
  type: 'command_result';
  command: CommandType;
  correlationId: string;     // Matches commandId
  status: 'success' | 'error';
  timestamp: number;
  payload?: unknown;
  error?: {
    code: string;
    message: string;
  };
}
```

**Screenshot Special Case - TWO-STEP:**

Step 1 - MQTT Acknowledgment (Player → Backend):
```json
{
  "type": "command_ack",
  "command": "screenshot",
  "correlationId": "abc-123",
  "status": "success",
  "message": "Screenshot captured, uploading via HTTP",
  "timestamp": 1700000000
}
```

Step 2 - HTTP Upload (Player → Backend):
```http
POST /api/screenshots HTTP/1.1
Host: backend:3000
Content-Type: multipart/form-data
X-Command-Id: abc-123
X-Device-Id: player-001

[binary image data]
```

**Why Hybrid Approach:**
- MQTT: Acknowledge command received (small, instant)
- HTTP: Upload binary image (efficient, no base64 overhead)
- Better architecture than base64 in MQTT

---

## 4. MQTT Protocol Specification (For Review)

### 4.1 Topic Structure
```
signage/{orgId}/{locationId}/{deviceId}/{category}
```

**Examples:**
- Subscribe: `signage/acme/store001/player001/commands`
- Publish: `signage/acme/store001/player001/responses`
- Status: `signage/acme/store001/player001/status`
- Events: `signage/acme/store001/player001/events`

**Discussion Points:**
- Is `orgId` needed or over-engineering?
- Flat or hierarchical topics preferred?
- Wildcard subscriptions acceptable?

### 4.2 QoS Strategy (NEED DECISION)

| Message Type | Proposed QoS | Rationale |
|--------------|--------------|-----------|
| Commands | 1 (At least once) | Reliable delivery, idempotent handling |
| Responses | 1 (At least once) | Acknowledgment needed |
| Status | 1 + Retained | Last known state for new subscribers |
| Events | 0 (At most once) | Fire-and-forget logging |
| Heartbeat | 0 (At most once) | Frequent, loss acceptable |

**Question:** Agree with QoS levels? Use QoS 2 for critical commands?

### 4.3 Connection Parameters
```typescript
const mqttConfig = {
  keepalive: 60,              // Seconds
  connectTimeout: 30000,      // 30 seconds
  reconnectPeriod: 1000,      // Initial 1s, then exponential backoff
  clean: false,               // Persistent session
  will: {
    topic: '{baseTopic}/status',
    payload: JSON.stringify({ state: 'offline' }),
    qos: 1,
    retain: true
  }
};
```

**Discussion Points:**
- Keepalive interval? (60s standard, 30s for unstable networks)
- Max reconnection delay cap? (30s proposed)
- Clean session false = persistent subscriptions?

---

## 5. Offline-First Strategy (For Review)

### 5.1 Storage Architecture

#### Option A: IndexedDB Primary (Proposed)
- **IndexedDB:** All data (playlists, media chunks, metadata)
- **Cache API:** Static assets only (JS/CSS/HTML)
- **Pros:** Full control, large storage, structured queries
- **Cons:** More complex implementation

#### Option B: Cache API Primary
- **Cache API:** Static assets + media files
- **IndexedDB:** Playlist metadata and sync queue
- **Pros:** Simpler for media, browser optimized
- **Cons:** Less control over chunking/resume

**Question:** Which approach preferred?

### 5.2 Storage Quotas
- Request persistent storage: `navigator.storage.persist()`
- Monitor quota: `navigator.storage.estimate()`
- LRU eviction when approaching limit
- Minimum reserved space: 500MB?

### 5.3 Sync Strategy
```
ONLINE MODE:
  1. Fetch playlist from remote
  2. Compare version with cache
  3. Download new/modified media
  4. Update cache
  5. Start playback

OFFLINE MODE:
  1. Load playlist from cache
  2. Validate media availability
  3. Start playback from cache
  4. Queue commands for later sync
  5. Retry connection with backoff

RECONNECTION:
  1. Sync queued commands
  2. Check playlist updates
  3. Download new content
  4. Continue playback
```

---

## 6. Platform Abstraction (For Review)

### 6.1 Platform Capabilities Matrix

| Feature | Tizen | WebOS | Web |
|---------|-------|-------|-----|
| Media API | webapis.avplay | HTML5 Video | HTML5 Video |
| Volume Control | tizen.tvaudiocontrol | LS2 Audio | HTML5 Audio |
| Screenshot | Limited/None | Limited/None | Canvas/API |
| Storage | IndexedDB | IndexedDB | IndexedDB |
| Video Codecs | H.264, HEVC, VP9, AV1 | H.264, HEVC, VP9, AV1 | Depends on browser |

### 6.2 Screenshot Strategy (NEED DECISION)

#### Option A: Platform Native
- Tizen: Try `tizen.systeminfo` or AVPlay capture
- WebOS: Try Luna service if available
- **Pros:** Best quality, hardware accelerated
- **Cons:** May not be available, permissions complex

#### Option B: Canvas-Based (Proposed)
- Render video to canvas: `ctx.drawImage(video, 0, 0)`
- Convert to blob: `canvas.toBlob()`
- Base64 encode for MQTT response
- **Pros:** Universal, no permissions
- **Cons:** DRM content may be black, performance cost

#### Option C: Mock/Fake
- Return placeholder image with metadata
- Document limitation in README
- **Pros:** Always works
- **Cons:** Not actual screenshot

**Question:** Canvas-based acceptable? Document as limitation?

---

## 7. Player Behavior Specifications

### 7.1 Playback Flow
```
STARTUP:
  ↓
Load Cached Playlist ──No──→ Fetch Remote Playlist ──Fail──→ Error Screen
  ↓ Yes                              ↓ Success
Validate Media ──Invalid──→ Cleanup Cache → Retry Fetch
  ↓ Valid
Start Playback
  ↓
Item Ends ──More Items?──Yes──→ Transition ──→ Next Item
  ↓ No
Loop? ──Yes──→ First Item
  ↓ No
Idle State
```

### 7.2 Transition Options (NEED DECISION)

| Type | Implementation | Performance |
|------|---------------|-------------|
| Cut | Immediate swap | Best |
| Fade | CSS opacity 0→1 | Good |
| Slide | CSS transform | Good |
| Cross-fade | Two elements, overlap | Moderate |

**Question:** Support transitions or cut only? Configurable?

### 7.3 Error Handling Strategy

| Error Type | Behavior | Retry |
|------------|----------|-------|
| Network fetch | Use cache, retry in background | Exponential backoff |
| Media load | Skip to next item, log error | Immediate once |
| Parse error | Use cached version, alert | None |
| MQTT disconnect | Queue commands, reconnect | Exponential backoff |
| Storage full | LRU cleanup, log warning | None |

---

## 8. Build & Deployment (For Review)

### 8.1 Build Targets

| Target | Output | Notes |
|--------|--------|-------|
| Tizen | `.wgt` file | Signed for production |
| WebOS | IPK or hosted | LG Dev Mode or store |
| Web | Static files | Development/testing |

### 8.2 Build Scripts (Proposed)
```json
{
  "dev": "vite --host",
  "dev:mock": "vite --mode mock",
  "build:tizen": "vite build --mode tizen",
  "build:webos": "vite build --mode webos",
  "build:all": "npm run build:tizen && npm run build:webos",
  "package:wgt": "scripts/package-wgt.sh",
  "test": "vitest",
  "test:coverage": "vitest --coverage",
  "lint": "eslint src --ext .ts",
  "format": "prettier --write src/**/*.ts"
}
```

### 8.3 Tizen WGT Structure
```
myapp.wgt
├── config.xml          # App manifest
├── index.html          # Entry point
├── css/
├── js/
├── assets/
└── .manifest           # Auto-generated
```

**Discussion Points:**
- Self-signed certificate for dev?
- Samsung certificate for production?
- Build automation in CI/CD?

---

## 9. Testing Strategy (For Review)

### 9.1 Test Levels

| Level | Scope | Tools | Target |
|-------|-------|-------|--------|
| Unit | Domain logic, utils | Vitest | >60% coverage |
| Integration | Repositories, MQTT | Vitest + MSW | Critical paths |
| E2E | Full playback flow | Manual + Emulator | Smoke tests |

### 9.2 Critical Test Scenarios
- [ ] Playlist validation (invalid JSON, missing fields)
- [ ] Cache hit/miss logic
- [ ] MQTT reconnection with backoff
- [ ] Command deduplication
- [ ] Offline playback
- [ ] Memory leak prevention (24/7 scenario)
- [ ] Error boundaries (no crash)

---

## 10. Documentation Requirements

### 10.1 Required Documents
1. **README.md** - Quick start, build, run
2. **ARCHITECTURE.md** - Design decisions, patterns
3. **MQTT_PROTOCOL.md** - Topic structure, payloads
4. **OFFLINE_STRATEGY.md** - Caching, sync behavior
5. **TIZEN_SETUP.md** - Studio install, emulator, signing

### 10.2 Code Documentation
- JSDoc for public APIs
- Inline comments for complex logic only
- No redundant comments
- TypeScript types as documentation

---

## 11. Open Questions / Decisions Needed

### Critical Decisions (Block Implementation)

1. **Architecture Pattern**
   - [ ] Clean Architecture (layers)
   - [ ] Feature-Based
   - [ ] Simple Layered

2. **Storage Strategy**
   - [ ] IndexedDB primary
   - [ ] Cache API primary

3. **Screenshot Implementation**
   - [ ] Canvas-based (mock if fails)
   - [ ] Platform native (with fallback)
   - [ ] Always mock (document limitation)

4. **Transition Effects**
   - [ ] Cut only (simplest)
   - [ ] Configurable (fade, slide)

5. **MQTT QoS Strategy**
   - [ ] Proposed (QoS 1 commands, QoS 0 telemetry)
   - [ ] All QoS 1 (more reliable, more overhead)
   - [ ] Mixed with QoS 2 for critical

### Secondary Decisions (Can Iterate)

6. **Testing Framework**
   - [ ] Vitest (fast, native ESM)
   - [ ] Jest (mature, widely used)

7. **State Management**
   - [ ] RxJS BehaviorSubject (reactive)
   - [ ] Simple EventEmitter (lightweight)
   - [ ] No library (custom observer)

8. **HTTP Client**
   - [ ] Native fetch (modern)
   - [ ] Axios (mature, interceptors)

9. **Build Output**
   - [ ] ES2015 only (broad support)
   - [ ] ES2020 with fallbacks (modern features)

10. **Code Style**
    - [ ] 2 spaces (common)
    - [ ] 4 spaces (more readable)
    - [ ] Tabs (accessibility)

11. **Backend Infrastructure** (NEW)
    - [ ] Docker Compose stack (Mosquitto + Express + Nginx)
    - [ ] Static files + public MQTT broker
    - [ ] Minimal Express only

12. **Testing Tool** (NEW)
    - [ ] CLI tool only (npm run mqtt:send)
    - [ ] Web UI for command testing

---

## 12. MVP vs Full Scope

### MVP (Minimum Viable Product)
- [ ] Tizen platform only
- [ ] Images and MP4 videos only
- [ ] Cut transitions only
- [ ] Basic MQTT commands (play, pause, reload)
- [ ] Canvas screenshot
- [ ] IndexedDB storage
- [ ] Unit tests for domain
- [ ] Working .wgt build
- [ ] README documentation

### Full Scope
- [ ] WebOS support
- [ ] HLS/DASH streaming
- [ ] Configurable transitions
- [ ] All MQTT commands + screenshot
- [ ] Platform native screenshot if available
- [ ] Advanced sync strategies
- [ ] Full test coverage
- [ ] CI/CD pipeline
- [ ] Complete documentation suite

**Question:** MVP approach or full scope from start?

---

## 13. Backend / Infrastructure Requirements

You're absolutely right - we need backend infrastructure for testing and development!

### 13.1 Required Infrastructure Components

| Component | Purpose | Implementation |
|-----------|---------|----------------|
| **MQTT Broker** | Command/response messaging | Mosquitto in Docker |
| **Playlist API** | Serve playlist JSON | Express.js mock server |
| **Media Server** | Serve images/videos | Static file server or CDN |
| **MQTT Command Tool** | Send test commands | CLI tool or simple UI |

### 13.2 Backend Options (NEED DECISION)

#### Option A: Docker Compose Stack (Recommended)
```yaml
# docker-compose.yml
services:
  mosquitto:
    image: eclipse-mosquitto:2
    ports: ["1883:1883", "9001:9001"]
  
  playlist-api:
    image: node:20-alpine
    volumes: ["./mock-api:/app"]
    ports: ["3000:3000"]
  
  media-server:
    image: nginx:alpine
    volumes: ["./media:/usr/share/nginx/html"]
    ports: ["8080:80"]
```

**Pros:** Full control, reproducible, works offline  
**Cons:** More setup, requires Docker

#### Option B: Static Files + Public MQTT
- Playlist: Static JSON hosted on GitHub Pages/Netlify
- Media: Public URLs (placeholder images/videos)
- MQTT: Public broker (broker.hivemq.com, test.mosquitto.org)

**Pros:** Zero setup, works immediately  
**Cons:** Requires internet, not private, rate limits

#### Option C: Minimal Express Server
```javascript
// Simple Express backend
const app = express();

// GET /api/playlist - Returns playlist JSON
app.get('/api/playlist', (req, res) => {
  res.json({ playlist: [...] });
});

// POST /api/command - Proxy commands to MQTT
app.post('/api/command', (req, res) => {
  mqttClient.publish(`players/${req.body.deviceId}/commands`, req.body);
});
```

**Pros:** Flexible, can add features  
**Cons:** Need to develop, maintain

**Question:** Which backend approach? Docker stack recommended for reliable testing.

### 13.3 MQTT Testing Tool Requirements

Simple tool to send commands during development:

```bash
# CLI usage
npm run mqtt:send -- --device player-001 --command reload_playlist
npm run mqtt:send -- --device player-001 --command screenshot
```

Or minimal web UI at `http://localhost:3000/admin`:
- Device selector
- Command buttons (play, pause, reload, screenshot)
- Response viewer
- Connection status

**Question:** CLI tool sufficient or need web UI for testing?

### 13.4 Screenshot Upload Architecture

**User's Correct Approach - UPDATED:**

Screenshot command flow (hybrid MQTT + HTTP):

```
1. Client (Dashboard) 
   HTTP POST /api/commands
   → { deviceId: "player-001", command: "screenshot" }

2. Backend
   Receives HTTP POST
   → Publishes MQTT to "players/player-001/commands"
   → { command: "screenshot", commandId: "abc-123" }

3. Player
   Receives MQTT command
   → Takes screenshot (canvas/platform API)
   → HTTP POST to backend: /api/screenshots
   → multipart/form-data (image blob)
   → Headers: X-Command-Id: abc-123

4. Backend
   Receives HTTP POST with image
   → Saves to disk/MinIO/S3
   → Returns URL: { url: "/screenshots/player-001-12345.png" }
   → (Optional) Publishes MQTT ack to player
   → Returns HTTP response to client

5. Client
   Receives: { status: "success", url: "...", commandId: "abc-123" }
```

**Why This is Better:**
- MQTT: Only for commands (small payloads, instant)
- HTTP: For file uploads (binary, efficient, no base64 overhead)
- Clean separation of concerns

### 13.5 Sample Data Requirements

For testing, we need:

1. **Sample Images** (3-5 test images)
   - 1920x1080 resolution
   - JPG format
   - Various sizes (1MB, 5MB, 10MB)

2. **Sample Videos** (3 test videos)
   - 1920x1080, 10-30 seconds each
   - MP4 format (H.264)
   - Various sizes (5MB, 20MB, 50MB)

3. **Test Playlist JSON**
   ```json
   {
     "playlist": [
       { "type": "image", "url": "http://localhost:8080/test1.jpg", "duration": 5 },
       { "type": "video", "url": "http://localhost:8080/test1.mp4" },
       { "type": "image", "url": "http://localhost:8080/test2.jpg", "duration": 10 }
     ]
   }
   ```

**Question:** Include sample media in repo or download scripts? (Git LFS or external?)

### 13.5 Production Backend Assumptions

The player assumes a production backend provides:
- REST API endpoint: `GET https://api.signage.company/players/{deviceId}/playlist`
- MQTT Broker: `mqtts://mqtt.signage.company:8883`
- Authentication: JWT token or client certificates
- Media CDN: `https://cdn.signage.company/media/...`

For this case study, we build the **player only** with mock backend for testing.

---

## Next Steps

1. **Review this draft** - Mark decisions, add comments
2. **Discuss open questions** - Resolve critical decisions
3. **Finalize specification** - Update to v1.0
4. **Create tasks** - Break down into implementable units
5. **Start development** - Begin with DSP-001

---

**Please review and provide feedback on:**
- Architecture choice (Section 2.3)
- Storage strategy (Section 5.1)
- Screenshot approach (Section 6.2)
- Any other concerns or preferences
