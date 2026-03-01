import type { PlaylistResponse } from '@signage/contracts'
import { computeHash } from '@/app/cache/hash'
import { readJsonStorage, writeJsonStorage } from '@/app/cache/storage'

const CACHE_SCHEMA_VERSION = 1
const CACHE_KEY_PREFIX = 'signage:playlist-cache:'

interface PlaylistCacheEntry {
  schemaVersion: number
  hash: string
  savedAt: number
  response: PlaylistResponse
}

export interface PlaylistCacheReadResult {
  hash: string
  savedAt: number
  response: PlaylistResponse
}

function getStorageKey(deviceId: string): string {
  return `${CACHE_KEY_PREFIX}${deviceId}`
}

export function readPlaylistCache(deviceId: string): PlaylistCacheReadResult | null {
  const parsed = readJsonStorage<PlaylistCacheEntry>(getStorageKey(deviceId))
  if (!parsed) {
    return null
  }

  if (parsed.schemaVersion !== CACHE_SCHEMA_VERSION) {
    return null
  }

  if (!parsed.response || !Array.isArray(parsed.response.content)) {
    return null
  }

  return {
    hash: parsed.hash,
    savedAt: parsed.savedAt,
    response: parsed.response,
  }
}

export function writePlaylistCache(deviceId: string, response: PlaylistResponse): string | null {
  const hash = computeHash(response)

  const entry: PlaylistCacheEntry = {
    schemaVersion: CACHE_SCHEMA_VERSION,
    hash,
    savedAt: Date.now(),
    response,
  }

  if (!writeJsonStorage(getStorageKey(deviceId), entry)) {
    return null
  }

  return hash
}
