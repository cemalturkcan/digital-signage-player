# Offline-First Strategy

## Overview

The player must operate without network connectivity, using cached content and queuing commands for later sync.

## Storage Architecture

### Primary: IndexedDB

```
database: signage-player
├── playlists (objectStore)
│   └── { id, version, items, updatedAt }
├── media (objectStore)
│   └── { id, blob, checksum, cachedAt }
├── commands (objectStore)
│   └── { id, command, params, queuedAt }
└── config (objectStore)
    └── { key, value }
```

### Quota Management

- TODO: Implement persistent storage request
- TODO: Implement quota monitoring
- TODO: Implement LRU eviction
- TODO: Define minimum reserved space (500MB?)

## Sync Strategy

### Online Mode

```
1. Fetch playlist from remote
2. Compare version with cache
3. Download new/modified media
4. Update cache
5. Start playback
```

### Offline Mode

```
1. Load playlist from cache
2. Validate media availability
3. Start playback from cache
4. Queue commands for later sync
5. Retry connection with backoff
```

### Reconnection

```
1. Sync queued commands
2. Check playlist updates
3. Download new content
4. Continue playback
```

## Command Queue

### Queue Structure

```typescript
interface QueuedCommand {
  id: string;
  type: CommandType;
  params?: Record<string, unknown>;
  queuedAt: number;
  retryCount: number;
}
```

### Sync Behavior

- TODO: Implement command deduplication
- TODO: Implement retry with backoff
- TODO: Handle partial sync failures
- TODO: Define max queue size

## Cache Invalidation

### Playlist Versioning

- Playlist includes `version` field
- Compare versions on fetch
- Only download changed items

### Media Validation

- Check `checksum` against stored blob
- Re-download if mismatch
- Remove orphaned media files

## Error Handling

| Error Type    | Behavior                          |
|---------------|-----------------------------------|
| Network fetch | Use cache, retry in background    |
| Media load    | Skip to next item, log error      |
| Parse error   | Use cached version, alert         |
| MQTT disconnect| Queue commands, reconnect        |
| Storage full  | LRU cleanup, log warning          |

## TODO

- [ ] Implement storage service
- [ ] Implement sync scheduler
- [ ] Implement cache cleanup
- [ ] Implement offline UI indicators
- [ ] Document storage quota limits per platform
