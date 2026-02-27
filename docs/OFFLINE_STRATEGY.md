# Offline-First Strategy

## Current Implementation

The player implements a practical offline-first approach with two-tier caching and automatic reconnection.

## Storage Architecture

### Playlist Cache (localStorage)

```typescript
const PLAYLIST_KEY = 'signage:playlist'
// Stores: { id, version, items, loop, updatedAt }
```

- Synchronous read/write
- Survives browser restarts
- ~5MB limit (sufficient for playlist metadata)

### Media Cache (Cache API)

```typescript
const CACHE_NAME = 'signage-media-cache-v1'
// Stores: Response objects keyed by /media/{id}
```

- Async, promise-based API
- Handles Blob storage efficiently
- Browser-managed quota (typically 50-200MB)
- Persists across sessions

## Sync Behavior

### Online Mode

```
1. Fetch playlist from /api/playlist
2. Save to localStorage
3. Prefetch media items in background
4. Start playback
```

### Offline Mode

```
1. Load playlist from localStorage
2. Check media availability in Cache API
3. Use cached blob URLs for playback
4. Continue with cached content
5. Attempt MQTT reconnect in background
```

### Reconnection Flow

```
1. Network restored
2. MQTT client auto-reconnects (5s interval)
3. Re-subscribes to command topic
4. Continues normal operation
5. Next playlist fetch updates cache
```

## Implementation Details

### Media Prefetch

```typescript
async prefetchMedia(items: MediaItem[]): Promise<void> {
  for (const item of items) {
    if (await hasMedia(item.id)) continue
    try {
      const response = await fetch(item.url, { mode: 'cors' })
      if (response.ok) {
        const blob = await response.blob()
        await saveMedia(item.id, blob)
      }
    } catch {
      // Continue with other items
    }
  }
}
```

### Cached URL Resolution

```typescript
async getCachedUrl(item: MediaItem): Promise<string> {
  const blob = await loadMedia(item.id)
  if (blob) {
    return URL.createObjectURL(blob)  // Local blob URL
  }
  return item.url  // Fallback to remote
}
```

## Limitations

### 1. No Command Queue

Commands sent while player is offline are **not** queued or retried. The MQTT broker (Mosquitto) is configured with `clean: true`, so:

- No offline message buffering
- Commands sent during disconnection are lost
- Player only processes commands received while connected

**Workaround**: Backend should implement command retry with exponential backoff for critical commands.

### 2. No Cache Eviction Strategy

Current implementation:

- No LRU or size-based eviction
- Cache grows until browser quota reached
- `clear()` method available for manual cleanup

**Planned**: Add quota monitoring and LRU eviction.

### 3. Partial Media Failures

If media prefetch fails for an item:

- Player continues with other items
- Failed item attempted from remote URL on playback
- If offline, item skipped with error logged

### 4. No Delta Sync

Entire playlist replaced on each `reload_playlist`:

- Inefficient for large playlists
- All media re-validated on fetch

**Planned**: Add ETag-based conditional fetch and incremental updates.

## Error Handling

| Scenario               | Behavior                                 |
| ---------------------- | ---------------------------------------- |
| Network fetch fails    | Use cached playlist, retry in background |
| Media load fails       | Skip to next item, log error             |
| Cache write fails      | Continue without caching                 |
| MQTT disconnect        | Queue not implemented; commands lost     |
| Storage quota exceeded | Cache write fails silently               |

## Configuration

No runtime configuration for offline behavior. Constants defined in code:

```typescript
const CACHE_NAME = 'signage-media-cache-v1'
const PLAYLIST_KEY = 'signage:playlist'
```

## Future Enhancements

1. **Command Queue**: IndexedDB-backed queue for offline commands
2. **Delta Sync**: Version-based playlist updates
3. **Smart Eviction**: LRU with size quotas
4. **Sync Status UI**: Visual indicator for sync state
5. **Background Sync**: Service Worker for deferred operations
